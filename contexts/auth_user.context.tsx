import { createContext, useContext, ReactNode } from 'react';
import useFirebaseAuth from '@/hooks/use_firebase_auth';
import { InAuthUser } from '@/models/in_auth_user';

interface InAuthUserContext {
  authUser: InAuthUser | null;
  loading: boolean;
  signInWithGoogle: () => void;
  signOut: () => void;
}

const AuthUserContext = createContext<InAuthUserContext>({
  authUser: null,
  loading: true,
  signInWithGoogle: async () => ({ user: null, credential: null }),
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  signOut: () => {},
});

export const AuthUserProvider = function ({ children }: { children: ReactNode }) {
  const auth = useFirebaseAuth();
  return <AuthUserContext.Provider value={auth}>{children}</AuthUserContext.Provider>;
};
// custom hook to use the authUserContext and access authUser and loading
export const useAuth = () => useContext(AuthUserContext);
