// pages/api/auth/spid-callback.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createRouter } from 'next-connect';
import passport from '../../../lib/passport';

// Estendi i tipi NextApiRequest/Response con quelli di Express
type ExtendedRequest = NextApiRequest & ExpressRequest;
type ExtendedResponse = NextApiResponse & ExpressResponse;

// Crea il router usando i tipi estesi
const router = createRouter<ExtendedRequest, ExtendedResponse>();

router.use(passport.initialize());

// Definisci la route POST (o GET a seconda del binding) per il callback SPID
router.post(
    passport.authenticate('spid', { session: false }),
    (req, res) => {
        // Qui gestisci la risposta SAML ricevuta dall'IdP.
        // Ad esempio, puoi creare una sessione utente o inviare una risposta JSON.
        res.status(200).json({ message: 'Autenticazione SPID riuscita', user: req.user });
    }
);

// Crea un NextApiHandler che "adatta" i tipi estesi ai tipi Next.js
const handler: NextApiHandler = (req, res) => {
    return router.handler()(req as ExtendedRequest, res as ExtendedResponse);
};

export default handler;
