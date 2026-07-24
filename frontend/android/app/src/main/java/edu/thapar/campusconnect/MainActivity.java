package edu.thapar.campusconnect;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

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
            updatePageForConnection(isInternetAvailable());
        });
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
}