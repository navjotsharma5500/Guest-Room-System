import { IKContext } from "imagekitio-react";
import { BACKEND_URL } from "../utils/apiConfig";
import { 
  IMAGEKIT_PUBLIC_KEY, 
  IMAGEKIT_URL_ENDPOINT, 
  IMAGEKIT_AUTH_ENDPOINT 
} from "../utils/apiConfig";

const API = BACKEND_URL;

export default function ImageKitProvider({ children }) {
  return (
    <IKContext
      publicKey={IMAGEKIT_PUBLIC_KEY}
      urlEndpoint={IMAGEKIT_URL_ENDPOINT}
      authenticationEndpoint={IMAGEKIT_AUTH_ENDPOINT}
    >
      {children}
    </IKContext>
  );
}
