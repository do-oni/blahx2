import { NextApiRequest, NextApiResponse } from 'next';
import FirebaseAdmin from '@/models/auth/firebase_admin';
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

export default function handler(_: NextApiRequest, res: NextApiResponse) {
  FirebaseAdmin.getInstance().Firestore.collection('test');
  res.status(200).json({ name: 'John Doe' });
}
