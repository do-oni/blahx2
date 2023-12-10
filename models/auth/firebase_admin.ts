import * as admin from 'firebase-admin';

interface Config {
  databaseurl: string;
  credential: {
    privateKey: string;
    clientEmail: string;
    projectId: string;
  };
}

// Singleton Class
export default class FirebaseAdmin {
  // 인스턴스 생성
  public static instance: FirebaseAdmin;

  // 초기화 여부
  private init = false;

  public static getInstance(): FirebaseAdmin {
    if (!FirebaseAdmin.instance) {
      // 초기화 진행
      FirebaseAdmin.instance = new FirebaseAdmin();
      // 환경 초기화
      FirebaseAdmin.instance.bootstrap();
    }
    return FirebaseAdmin.instance;
  }

  private bootstrap(): void {
    if (!!admin.apps.length === true) {
      this.init = true;
      return;
    }
    const config: Config = {
      databaseurl: process.env.databaseurl || '',
      credential: {
        projectId: process.env.projectId || '',
        clientEmail: process.env.clientEmail || '',
        privateKey: (process.env.privateKey || '').replace(/\\n/g, '\n'),
      },
    };

    admin.initializeApp({
      databaseURL: config.databaseurl,
      credential: admin.credential.cert(config.credential),
    });
  }

  /** firestore를 반환 */
  public get Firestore(): FirebaseFirestore.Firestore {
    if (this.init === false) {
      this.bootstrap();
    }
    return admin.firestore();
  }

  public get Auth(): admin.auth.Auth {
    if (this.init === false) {
      this.bootstrap();
    }
    return admin.auth();
  }
}
