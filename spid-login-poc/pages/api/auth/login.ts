// pages/api/auth/login.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createRouter } from 'next-connect';
import passport from '../../../lib/passport';

// Estendiamo NextApiRequest e NextApiResponse con i tipi di Express
type ExtendedRequest = NextApiRequest & ExpressRequest;
type ExtendedResponse = NextApiResponse & ExpressResponse;

// Creiamo il router con i tipi estesi
const router = createRouter<ExtendedRequest, ExtendedResponse>();

router.use(passport.initialize());

// Definiamo la route GET: Passport gestirà il redirect all'IdP
router.get(
    passport.authenticate('spid', { session: false }),
    (req, res) => {
        // Questa callback non verrà eseguita perché Passport effettua il redirect.
    }
);

// Creiamo un NextApiHandler che "adatta" i tipi estesi ai tipi Next.js
const handler: NextApiHandler = (req, res) => {
    // Effettuiamo un cast a ExtendedRequest/ExtendedResponse per passare i parametri al router
    return router.handler()(req as ExtendedRequest, res as ExtendedResponse);
};

export default handler;




