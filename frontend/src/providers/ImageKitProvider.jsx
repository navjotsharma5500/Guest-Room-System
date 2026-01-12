import { IKContext } from "imagekitio-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:10000";

export default function ImageKitProvider({ children }) {
  return (
    <IKContext
      publicKey={process.env.REACT_APP_IMAGEKIT_PUBLIC_KEY || "public_D/IvtqR075bhEwQyEOFWMa15N28="}
      urlEndpoint={process.env.REACT_APP_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/7khjnlfow"}
      authenticationEndpoint={`${process.env.REACT_APP_BACKEND_URL}/api/imagekit/auth`}
    >
      {children}
    </IKContext>
  );
}
