import React from 'react';
import { IKUpload as IKUploadOriginal } from 'imagekitio-react';
import { Upload } from 'lucide-react';

const IKUpload = ({ 
  onSuccess, 
  onError, 
  folder, 
  buttonText, 
  buttonClassName = "",
  ...props 
}) => {
  
  const onUploadError = (err) => {
    console.error('ImageKit Upload Error:', err);
    if (onError) onError(err);
  };

  const onUploadSuccess = (res) => {
    console.log('ImageKit Upload Success:', res);
    // Extract URL from response and pass to callback
    if (onSuccess) onSuccess(res.url);
  };

  return (
    <>
      {buttonText ? (
        <label className={`cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl hover:bg-purple-50 hover:border-purple-300 transition group ${buttonClassName}`}>
            <Upload className="w-5 h-5 text-gray-500 group-hover:text-purple-600 transition" />
            <span className="text-gray-600 font-medium group-hover:text-purple-700 transition">{buttonText}</span>
            <IKUploadOriginal
                folder={folder || "/guestroom"}
                onError={onUploadError}
                onSuccess={onUploadSuccess}
                style={{ display: 'none' }}
                {...props}
            />
        </label>
      ) : (
        <IKUploadOriginal
            folder={folder || "/guestroom"}
            onError={onUploadError}
            onSuccess={onUploadSuccess}
            className={buttonClassName}
            {...props}
        />
      )}
    </>
  );
};

export default IKUpload;