// pages/api/auth/metadata.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getMetadata } from '@/lib/passport';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const metadataXML = getMetadata();
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(metadataXML);
}
