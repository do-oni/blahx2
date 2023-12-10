import { Auth, getAuth } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import getConfig from 'next/config';

const { publicRuntimeConfig } = getConfig();

/** .env config 가 클라이언트 사이드까지 한번에 전달되지 않기 때문에 next config에 정의해주어야 함. */
const FirebaseCredentials = {
  apiKey: publicRuntimeConfig.publicApiKey,
  authDomain: publicRuntimeConfig.authDomain,
  projectId: publicRuntimeConfig.projectId,
};

export default class FirebaseClient {
  private static instance: FirebaseClient;

  private auth: Auth;

  public constructor() {
    const apps = getApps();

    if (!apps.length) {
      initializeApp(FirebaseCredentials);
    }
    this.auth = getAuth();
  }

  public static getInstance(): FirebaseClient {
    if (!FirebaseClient.instance) {
      FirebaseClient.instance = new FirebaseClient();
    }
    return FirebaseClient.instance;
  }

  public get Auth(): Auth {
    return this.auth;
  }
}
