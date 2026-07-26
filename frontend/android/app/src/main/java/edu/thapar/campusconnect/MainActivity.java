package edu.thapar.campusconnect;

import android.app.DownloadManager;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.content.ContentValues;
import android.provider.MediaStore;
import android.util.Base64;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import org.json.JSONObject;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    private static final String ONLINE_URL =
            "https://campusconnect.thapar.edu";

    private static final String OFFLINE_URL =
            "file:///android_asset/public/offline.html";

    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;

    private boolean showingOfflinePage = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        connectivityManager =
                (ConnectivityManager) getSystemService(
                        Context.CONNECTIVITY_SERVICE
                );

        setupNetworkCallback();

        /*
         * Wait until Capacitor's WebView has been created,
         * and then check the current internet connection.
         */
        getBridge().getWebView().post(() -> {
            setupDownloadListener();
            updatePageForConnection(isInternetAvailable());
        });
    }

    private void setupDownloadListener() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(
                new AndroidDownloader(),
                "AndroidDownloader"
        );

        installUniversalBlobDownloadHandler(webView);

        webView.setWebViewClient(
                new BridgeWebViewClient(getBridge()) {
                    @Override
                    public void onPageFinished(
                            WebView view,
                            String url
                    ) {
                        super.onPageFinished(view, url);

                        installUniversalBlobDownloadHandler(view);
                    }
                }
        );

        webView.setDownloadListener((
                url,
                userAgent,
                contentDisposition,
                mimeType,
                contentLength
        ) -> {

            android.util.Log.d("DOWNLOAD_URL", url);

            if (url != null && url.startsWith("blob:")) {
                handleBlobDownload(
                        webView,
                        url,
                        contentDisposition,
                        mimeType
                );
                return;
            }

            try {
                String fileName = URLUtil.guessFileName(
                        url,
                        contentDisposition,
                        mimeType
                );

                DownloadManager.Request request =
                        new DownloadManager.Request(Uri.parse(url));

                if (mimeType != null && !mimeType.trim().isEmpty()) {
                    request.setMimeType(mimeType);
                }

                String cookies =
                        CookieManager.getInstance().getCookie(url);

                if (cookies != null && !cookies.isEmpty()) {
                    request.addRequestHeader("Cookie", cookies);
                }

                if (userAgent != null && !userAgent.isEmpty()) {
                    request.addRequestHeader("User-Agent", userAgent);
                }

                request.setTitle(fileName);
                request.setDescription("Downloading file...");
                request.setNotificationVisibility(
                        DownloadManager.Request
                                .VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                );

                request.setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS,
                        fileName
                );

                DownloadManager downloadManager =
                        (DownloadManager) getSystemService(
                                Context.DOWNLOAD_SERVICE
                        );

                if (downloadManager == null) {
                    Toast.makeText(
                            this,
                            "Download service is unavailable.",
                            Toast.LENGTH_LONG
                    ).show();
                    return;
                }

                downloadManager.enqueue(request);

                Toast.makeText(
                        this,
                        "Downloading " + fileName,
                        Toast.LENGTH_SHORT
                ).show();

            } catch (Exception exception) {
                exception.printStackTrace();

                Toast.makeText(
                        this,
                        "Unable to download this file.",
                        Toast.LENGTH_LONG
                ).show();
            }
        });
    }

    private void installUniversalBlobDownloadHandler(WebView webView) {
        String javascript =
                "(function() {" +
                        "try {" +
                        "if (window.__androidBlobHandlerInstalled) {" +
                        "console.log('Android Blob handler already installed');" +
                        "return 'already-installed';" +
                        "}" +

                        "window.__androidBlobHandlerInstalled = true;" +
                        "window.__androidBlobStore = new Map();" +

                        "const originalCreateObjectURL =" +
                        "URL.createObjectURL.bind(URL);" +

                        "const originalRevokeObjectURL =" +
                        "URL.revokeObjectURL.bind(URL);" +

                        "URL.createObjectURL = function(object) {" +
                        "const generatedUrl = originalCreateObjectURL(object);" +

                        "if (object instanceof Blob) {" +
                        "window.__androidBlobStore.set(generatedUrl, object);" +
                        "console.log(" +
                        "'Stored Blob:'," +
                        "generatedUrl," +
                        "object.type," +
                        "object.size" +
                        ");" +
                        "}" +

                        "return generatedUrl;" +
                        "};" +

                        "URL.revokeObjectURL = function(url) {" +
                        "setTimeout(function() {" +
                        "window.__androidBlobStore.delete(url);" +
                        "originalRevokeObjectURL(url);" +
                        "}, 30000);" +
                        "};" +

                        "document.addEventListener(" +
                        "'click'," +
                        "function(event) {" +
                        "let anchor = event.target;" +

                        "while (anchor && anchor.tagName !== 'A') {" +
                        "anchor = anchor.parentElement;" +
                        "}" +

                        "if (!anchor) {" +
                        "return;" +
                        "}" +

                        "const href = anchor.href || '';" +

                        "if (!href.startsWith('blob:')) {" +
                        "return;" +
                        "}" +

                        "const blob =" +
                        "window.__androidBlobStore.get(href);" +

                        "if (!blob) {" +
                        "console.error(" +
                        "'Blob not found in Android store:'," +
                        "href" +
                        ");" +
                        "return;" +
                        "}" +

                        "event.preventDefault();" +
                        "event.stopPropagation();" +
                        "event.stopImmediatePropagation();" +

                        "const fileName =" +
                        "anchor.download || 'download';" +

                        "const mimeType =" +
                        "blob.type || 'application/octet-stream';" +

                        "const reader = new FileReader();" +

                        "reader.onloadend = function() {" +
                        "window.AndroidDownloader.saveBase64File(" +
                        "reader.result," +
                        "fileName," +
                        "mimeType" +
                        ");" +
                        "};" +

                        "reader.onerror = function() {" +
                        "window.AndroidDownloader.downloadError(" +
                        "'Unable to read Blob data.'" +
                        ");" +
                        "};" +

                        "reader.readAsDataURL(blob);" +
                        "}," +
                        "true" +
                        ");" +

                        "console.log('Universal Android Blob handler installed');" +
                        "return 'installed';" +

                        "} catch (error) {" +
                        "console.error(" +
                        "'Blob handler installation failed:'," +
                        "error" +
                        ");" +
                        "return 'installation-failed: ' + String(error);" +
                        "}" +
                        "})();";

        webView.evaluateJavascript(
                javascript,
                result -> android.util.Log.d(
                        "BLOB_INSTALL",
                        "Installation result = " + result
                )
        );
    }

    private void handleBlobDownload(
            WebView webView,
            String blobUrl,
            String contentDisposition,
            String mimeType
    ) {
        try {
            String fileName = URLUtil.guessFileName(
                    blobUrl,
                    contentDisposition,
                    mimeType
            );

            if (
                    mimeType != null
                            &&
                            !mimeType.trim().isEmpty()
                            &&
                            !fileName.contains(".")
            ) {
                String extension =
                        MimeTypeMap.getSingleton()
                                .getExtensionFromMimeType(mimeType);

                if (extension != null && !extension.isEmpty()) {
                    fileName = fileName + "." + extension;
                }
            }

            fileName = fileName.replaceAll(
                    "[\\\\/:*?\"<>|]",
                    "_"
            );

            String javascript =
                    "(async function() {" +
                            "try {" +
                            "const response = await fetch(" +
                            JSONObject.quote(blobUrl) +
                            ");" +
                            "const blob = await response.blob();" +
                            "const reader = new FileReader();" +

                            "reader.onloadend = function() {" +
                            "window.AndroidDownloader.saveBase64File(" +
                            "reader.result," +
                            JSONObject.quote(fileName) +
                            "," +
                            JSONObject.quote(
                                    mimeType == null
                                            ? ""
                                            : mimeType
                            ) +
                            ");" +
                            "};" +

                            "reader.onerror = function() {" +
                            "window.AndroidDownloader.downloadError(" +
                            JSONObject.quote(
                                    "Unable to read the downloaded file."
                            ) +
                            ");" +
                            "};" +

                            "reader.readAsDataURL(blob);" +
                            "} catch (error) {" +
                            "window.AndroidDownloader.downloadError(" +
                            "String(error)" +
                            ");" +
                            "}" +
                            "})();";

            webView.evaluateJavascript(
                    javascript,
                    null
            );

        } catch (Exception exception) {
            exception.printStackTrace();

            Toast.makeText(
                    MainActivity.this,
                    "Unable to process this download.",
                    Toast.LENGTH_LONG
            ).show();
        }
    }

    private File createUniqueFile(
            File directory,
            String fileName
    ) {
        File file = new File(directory, fileName);

        if (!file.exists()) {
            return file;
        }

        String name = fileName;
        String extension = "";

        int dotIndex = fileName.lastIndexOf('.');

        if (dotIndex > 0) {
            name = fileName.substring(0, dotIndex);
            extension = fileName.substring(dotIndex);
        }

        int count = 1;

        while (true) {
            File candidate = new File(
                    directory,
                    name + " (" + count + ")" + extension
            );

            if (!candidate.exists()) {
                return candidate;
            }

            count++;
        }
    }

    private void setupNetworkCallback() {
        networkCallback =
                new ConnectivityManager.NetworkCallback() {

                    @Override
                    public void onAvailable(Network network) {
                        checkConnectionAgain();
                    }

                    @Override
                    public void onCapabilitiesChanged(
                            Network network,
                            NetworkCapabilities capabilities
                    ) {
                        boolean hasInternet =
                                capabilities.hasCapability(
                                        NetworkCapabilities.NET_CAPABILITY_INTERNET
                                )
                                &&
                                capabilities.hasCapability(
                                        NetworkCapabilities.NET_CAPABILITY_VALIDATED
                                );

                        updatePageForConnection(hasInternet);
                    }

                    @Override
                    public void onLost(Network network) {
                        checkConnectionAgain();
                    }
                };

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                connectivityManager.registerDefaultNetworkCallback(
                        networkCallback
                );
            } else {
                NetworkRequest request =
                        new NetworkRequest.Builder()
                                .addCapability(
                                        NetworkCapabilities.NET_CAPABILITY_INTERNET
                                )
                                .build();

                connectivityManager.registerNetworkCallback(
                        request,
                        networkCallback
                );
            }
        } catch (Exception exception) {
            exception.printStackTrace();
        }
    }

    private void checkConnectionAgain() {
        runOnUiThread(() -> {
            updatePageForConnection(isInternetAvailable());
        });
    }

    private boolean isInternetAvailable() {
        if (connectivityManager == null) {
            return false;
        }

        Network activeNetwork =
                connectivityManager.getActiveNetwork();

        if (activeNetwork == null) {
            return false;
        }

        NetworkCapabilities capabilities =
                connectivityManager.getNetworkCapabilities(activeNetwork);

        if (capabilities == null) {
            return false;
        }

        return capabilities.hasCapability(
                        NetworkCapabilities.NET_CAPABILITY_INTERNET
                )
                &&
                capabilities.hasCapability(
                        NetworkCapabilities.NET_CAPABILITY_VALIDATED
                );
    }

    private void updatePageForConnection(boolean hasInternet) {
        runOnUiThread(() -> {
            if (getBridge() == null) {
                return;
            }

            WebView webView = getBridge().getWebView();

            if (webView == null) {
                return;
            }

            if (!hasInternet) {
                if (!showingOfflinePage) {
                    showingOfflinePage = true;
                    webView.loadUrl(OFFLINE_URL);
                }
            } else if (showingOfflinePage) {
                showingOfflinePage = false;
                webView.loadUrl(ONLINE_URL);
            }
        });
    }

    @Override
    public void onDestroy() {
        if (
                connectivityManager != null
                        && networkCallback != null
        ) {
            try {
                connectivityManager.unregisterNetworkCallback(
                        networkCallback
                );
            } catch (Exception ignored) {
                // Callback may already be unregistered.
            }
        }

        super.onDestroy();
    }

    private class AndroidDownloader {

        @JavascriptInterface
        public void download(
                String url,
                String requestedFileName,
                String mimeType
        ) {
            runOnUiThread(() -> {
                try {
                    Uri uri = Uri.parse(url);

                    String scheme = uri.getScheme();

                    if (
                            scheme == null
                                    ||
                            (
                                    !scheme.equalsIgnoreCase("https")
                                            &&
                                            !scheme.equalsIgnoreCase("http")
                            )
                    ) {
                        Toast.makeText(
                                MainActivity.this,
                                "Invalid download URL.",
                                Toast.LENGTH_LONG
                        ).show();

                        return;
                    }

                    String fileName = requestedFileName;

                    if (fileName == null || fileName.trim().isEmpty()) {
                        fileName = URLUtil.guessFileName(
                                url,
                                null,
                                mimeType
                        );
                    }

                    fileName = fileName.replaceAll(
                            "[\\\\/:*?\"<>|]",
                            "_"
                    );

                    DownloadManager.Request request =
                            new DownloadManager.Request(uri);

                    if (mimeType != null && !mimeType.trim().isEmpty()) {
                        request.setMimeType(mimeType);
                    }

                    String cookies =
                            CookieManager.getInstance().getCookie(url);

                    if (cookies != null && !cookies.isEmpty()) {
                        request.addRequestHeader(
                                "Cookie",
                                cookies
                        );
                    }

                    WebView webView = getBridge().getWebView();

                    if (webView != null) {
                        String userAgent =
                                webView.getSettings().getUserAgentString();

                        if (
                                userAgent != null
                                        &&
                                        !userAgent.isEmpty()
                        ) {
                            request.addRequestHeader(
                                    "User-Agent",
                                    userAgent
                            );
                        }
                    }

                    request.setTitle(fileName);
                    request.setDescription("Downloading file...");

                    request.setNotificationVisibility(
                            DownloadManager.Request
                                    .VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                    );

                    request.setDestinationInExternalPublicDir(
                            Environment.DIRECTORY_DOWNLOADS,
                            fileName
                    );

                    DownloadManager downloadManager =
                            (DownloadManager) getSystemService(
                                    Context.DOWNLOAD_SERVICE
                            );

                    if (downloadManager == null) {
                        Toast.makeText(
                                MainActivity.this,
                                "Download service is unavailable.",
                                Toast.LENGTH_LONG
                        ).show();

                        return;
                    }

                    downloadManager.enqueue(request);

                    Toast.makeText(
                            MainActivity.this,
                            "Downloading " + fileName,
                            Toast.LENGTH_SHORT
                    ).show();

                } catch (Exception exception) {
                    exception.printStackTrace();

                    Toast.makeText(
                            MainActivity.this,
                            "Unable to download this file.",
                            Toast.LENGTH_LONG
                    ).show();
                }
            });
        }

        @JavascriptInterface
        public void saveBase64File(
                String dataUrl,
                String requestedFileName,
                String fallbackMimeType
        ) {
            new Thread(() -> {
                android.util.Log.d(
                        "BLOB_DOWNLOAD",
                        "saveBase64File() called"
                );
                Uri savedFileUri = null;

                try {
                    if (
                            dataUrl == null
                                    ||
                            !dataUrl.contains(",")
                    ) {
                        throw new IllegalArgumentException(
                                "Invalid file data."
                        );
                    }

                    int commaPosition = dataUrl.indexOf(",");

                    String metadata =
                            dataUrl.substring(0, commaPosition);

                    String base64Data =
                            dataUrl.substring(commaPosition + 1);

                    String detectedMimeType = "";

                    if (
                            metadata.startsWith("data:")
                                    &&
                            metadata.contains(";")
                    ) {
                        detectedMimeType =
                                metadata.substring(
                                        5,
                                        metadata.indexOf(";")
                                );
                    }

                    String finalMimeType =
                            detectedMimeType == null
                                    ||
                                    detectedMimeType.trim().isEmpty()
                                    ? fallbackMimeType
                                    : detectedMimeType;

                    if (
                            finalMimeType == null
                                    ||
                            finalMimeType.trim().isEmpty()
                    ) {
                        finalMimeType =
                                "application/octet-stream";
                    }

                    String fileName = requestedFileName;

                    if (
                            fileName == null
                                    ||
                            fileName.trim().isEmpty()
                    ) {
                        fileName = "download";

                        String extension =
                                MimeTypeMap.getSingleton()
                                        .getExtensionFromMimeType(
                                                finalMimeType
                                        );

                        if (
                                extension != null
                                        &&
                                !extension.isEmpty()
                        ) {
                            fileName =
                                    fileName + "." + extension;
                        }
                    }

                    fileName = fileName.replaceAll(
                            "[\\\\/:*?\"<>|]",
                            "_"
                    );

                    byte[] fileBytes =
                            Base64.decode(
                                    base64Data,
                                    Base64.DEFAULT
                            );

                    android.util.Log.d(
                            "BLOB_DOWNLOAD",
                            "Decoded bytes = " + fileBytes.length
                    );

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        ContentValues values =
                                new ContentValues();

                        values.put(
                                MediaStore.Downloads.DISPLAY_NAME,
                                fileName
                        );

                        values.put(
                                MediaStore.Downloads.MIME_TYPE,
                                finalMimeType
                        );

                        values.put(
                                MediaStore.Downloads.RELATIVE_PATH,
                                Environment.DIRECTORY_DOWNLOADS
                        );

                        values.put(
                                MediaStore.Downloads.IS_PENDING,
                                1
                        );

                        savedFileUri =
                                getContentResolver().insert(
                                        MediaStore.Downloads
                                                .EXTERNAL_CONTENT_URI,
                                        values
                                );

                        if (savedFileUri == null) {
                            throw new Exception(
                                    "Unable to create the downloaded file."
                            );
                        }

                        try (
                                OutputStream outputStream =
                                        getContentResolver()
                                                .openOutputStream(
                                                        savedFileUri
                                                )
                        ) {
                            if (outputStream == null) {
                                throw new Exception(
                                        "Unable to open the downloaded file."
                                );
                            }

                            outputStream.write(fileBytes);
                            outputStream.flush();
                        }

                        ContentValues completedValues =
                                new ContentValues();

                        completedValues.put(
                                MediaStore.Downloads.IS_PENDING,
                                0
                        );

                        getContentResolver().update(
                                savedFileUri,
                                completedValues,
                                null,
                                null
                        );

                    } else {
                        File downloadsDirectory =
                                Environment
                                        .getExternalStoragePublicDirectory(
                                                Environment
                                                        .DIRECTORY_DOWNLOADS
                                        );

                        if (
                                !downloadsDirectory.exists()
                                        &&
                                !downloadsDirectory.mkdirs()
                        ) {
                            throw new Exception(
                                    "Unable to access Downloads folder."
                            );
                        }

                        File outputFile =
                                createUniqueFile(
                                        downloadsDirectory,
                                        fileName
                                );

                        try (
                                FileOutputStream outputStream =
                                        new FileOutputStream(
                                                outputFile
                                        )
                        ) {
                            outputStream.write(fileBytes);
                            outputStream.flush();
                        }
                    }

                    String completedFileName = fileName;

                    android.util.Log.d(
                            "BLOB_DOWNLOAD",
                            "File saved successfully"
                    );

                    runOnUiThread(() ->
                            Toast.makeText(
                                    MainActivity.this,
                                    completedFileName
                                            + " saved to Downloads",
                                    Toast.LENGTH_LONG
                            ).show()
                    );
                    
                } catch (Exception exception) {
                    exception.printStackTrace();

                    android.util.Log.e(
                            "BLOB_DOWNLOAD",
                            exception.toString(),
                            exception
                    );

                    if (
                            Build.VERSION.SDK_INT
                                    >= Build.VERSION_CODES.Q
                                    &&
                            savedFileUri != null
                    ) {
                        try {
                            getContentResolver().delete(
                                    savedFileUri,
                                    null,
                                    null
                            );
                        } catch (Exception ignored) {
                            // Ignore cleanup failure.
                        }
                    }

                    runOnUiThread(() ->
                            Toast.makeText(
                                    MainActivity.this,
                                    "Unable to save this file.",
                                    Toast.LENGTH_LONG
                            ).show()
                    );
                }
            }).start();
        }

        @JavascriptInterface
        public void downloadError(String message) {
            runOnUiThread(() -> {
                android.util.Log.e(
                        "BLOB_DOWNLOAD",
                        message == null
                                ? "Unknown download error"
                                : message
                );

                Toast.makeText(
                        MainActivity.this,
                        "Unable to download this file.",
                        Toast.LENGTH_LONG
                ).show();
            });
        }
    }
}