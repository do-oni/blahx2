import { User, GoogleAuthProvider, TwitterAuthProvider, signInWithPopup } from 'firebase/auth';
import { useState, useEffect } from 'react';
import FirebaseClient from '@/models/auth/firebase_client';
import { InAuthUser } from './interface/in_auth_user';
import { memberAddForClient } from '@/models/member/member.client.service';

function formatAuthUser(user: User & { reloadUserInfo?: { screenName: string } }): InAuthUser {
  return {
    uid: user.uid,
    email: user.email,
    photoURL: user.photoURL,
    displayName: user.displayName,
    screenName: user.reloadUserInfo?.screenName ?? null,
  };
}

export default function useFirebaseAuth() {
  const [authUser, setAuthUser] = useState<InAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const authStateChanged = async (authState: User | null) => {
    if (!authState) {
      setAuthUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const formattedUser = formatAuthUser(authState);
    setAuthUser(formattedUser);
    setLoading(false);
  };

  const clear = () => {
    setAuthUser(null);
    setLoading(true);
  };

  async function signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    try {
      const signInResult = await signInWithPopup(FirebaseClient.getInstance().Auth, provider);

      if (signInResult.user) {
        const res = await fetch('/api/members.add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: signInResult.user.uid,
            email: signInResult.user.email,
            displayName: signInResult.user.displayName,
            photoURL: signInResult.user.photoURL,
          }),
        });
        await res.json();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function signInWithTwitter(): Promise<void> {
    const provider = new TwitterAuthProvider();
    try {
      const signInResult = await signInWithPopup(FirebaseClient.getInstance().Auth, provider);
      if (signInResult.user) {
        const credential = TwitterAuthProvider.credentialFromResult(signInResult);
        if (credential === null) {
          return;
        }
        const token = credential.accessToken;
        const { secret } = credential;
        if (token === undefined || secret === undefined) {
          throw new Error();
        }
        const idToken = await signInResult.user.getIdToken();
        const { uid, displayName, photoURL } = signInResult.user;
        // uid
        // photoURL
        // displayName
        const resp = await memberAddForClient({
          data: {
            uid,
            displayName: displayName || undefined,
            screenName: '',
            photoURL: photoURL || undefined,
            provider: 'twitter',
            twitterAuth: {
              accessToken: token,
              secret,
              uid: signInResult.user.providerData[0].uid,
            },
          },
          token: idToken,
        });
        if (resp.status === 200 && resp.payload) {
          window.location.href = resp.payload;
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  const signOut = () => FirebaseClient.getInstance().Auth.signOut().then(clear);

  useEffect(() => {
    // listen for Firebase state change
    const unsubscribe = FirebaseClient.getInstance().Auth.onAuthStateChanged(authStateChanged);
    // getRedirectResultPostProcess();

    // unsubscribe to the listener when unmounting
    return () => unsubscribe();
  }, []);

  return {
    authUser,
    loading,
    signInWithGoogle,
    signInWithTwitter,
    signOut,
  };
}
