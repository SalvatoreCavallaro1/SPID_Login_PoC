// lib/passport.ts
// Questo modulo configura Passport per utilizzare la strategia SPID, leggendo
// certificati e parametri di configurazione da file e variabili d'ambiente.

import passport from 'passport';
import { SpidStrategy } from 'passport-spid'; // Importa la strategia SPID dalla libreria passport-spid
import fs from 'fs';
import path from 'path';

/*
  spidConfig è l'oggetto di configurazione per la strategia SPID ed è strutturato in diverse sezioni:

  - sp: Parametri base del Service Provider (SP)
  - idp: Parametri dell'Identity Provider (qui lasciato vuoto per il PoC)
  - saml: Impostazioni specifiche per il protocollo SAML (binding, algoritmi, ecc.)
  - spid: Informazioni aggiuntive richieste dalla libreria passport-spid, in particolare i dettagli
          del Service Provider. Questa sezione include "serviceProvider" che deve contenere, tra gli altri campi,
          un oggetto multilingue per "organization" e un "contactPerson" che include il campo obbligatorio "IPACode".
  - cache: Implementazione "dummy" della cache per le AuthnRequest. Ora include anche la funzione "delete".
*/

// Configura l'IdP di test. Se utilizzi spid-saml-check, imposta l'entryPoint e il certificato fornito dallo strumento.
// Assicurati di avere il file del certificato dell'IdP (ad esempio, "certs/spid-testidp.crt").
// Puoi anche impostare queste variabili d'ambiente:
// const idpTest = {
//     entryPoint: process.env.SPID_IDP_ENTRYPOINT || "https://localhost:8443",
//     cert: fs.readFileSync(path.join(process.cwd(), 'certs/spid-sp.crt'), 'utf8').toString(),
// };

const idp = 'https://localhost:8443';
const idpMetadata = fs.readFileSync(path.join(process.cwd(), 'metadata/folder/spid-saml-check-metadata.xml'), 'utf8').toString();

const spidConfig = {
    sp: {
        entityId: process.env.SPID_ENTITY_ID || "http://localhost:3000",
        callbackUrl: process.env.SPID_CALLBACK_URL || "http://localhost:3000/api/auth/spid-callback",
        privateCert: fs.readFileSync(path.join(process.cwd(), 'certs/spid-sp.pem'), 'utf8'),
        certificate: fs.readFileSync(path.join(process.cwd(), 'certs/spid-sp.crt'), 'utf8'),
        attributeConsumingServiceIndex: 0,
        identifierFormat: "urn:oasis:names:tc:SAML:2.0:nameid-format:transient",
        authnContext: "https://www.spid.gov.it/SpidL1",
        attributes: {
            name: "Required attributes",
            attributes: ["fiscalNumber", "name", "familyName", "email"]
        },
        organization: {
            name: "MyCompany",
            displayName: "My Company",
            URL: process.env.SPID_ENTITY_ID || "http://localhost:3000"
        }
    },
    // Configura l'IdP con il test IdP
    // idp: { test: idpTest },
    saml: {
        callbackUrl: process.env.SPID_CALLBACK_URL || "http://localhost:3000/api/auth/spid-callback",
        authnRequestBinding: "HTTP-Redirect" as "HTTP-Redirect",
        privateKey: fs.readFileSync(path.join(process.cwd(), 'certs/spid-sp.pem'), 'utf8').toString(),
        // Deve essere fornito come stringa
        attributeConsumingServiceIndex: '0', // index of 'acs' array
        signatureAlgorithm: 'sha256' as "sha256",
        digestAlgorithm: 'sha256' as "sha256",
        logoutCallbackUrl: process.env.SPID_LOGOUT_CALLBACK_URL || "http://localhost:3000/api/auth/spid-logout-callback",
        racComparison: "exact" as "exact"
    },
    spid: {
        serviceProvider: {
            entityId: process.env.SPID_ENTITY_ID || "http://localhost:3000",
            callbackUrl: process.env.SPID_CALLBACK_URL || "http://localhost:3000/api/auth/spid-callback",
            certificate: fs.readFileSync(path.join(process.cwd(), 'certs/spid-sp.crt'), 'utf8').toString(),
            privateCert: fs.readFileSync(path.join(process.cwd(), 'certs/spid-sp.pem'), 'utf8').toString(),
            // "type" deve essere esattamente il literal "public"
            type: "public" as "public",
            // Informazioni di contatto per il supporto tecnico, includendo il campo obbligatorio IPACode
            contactPerson: {
                givenName: "Support",
                email: "support@example.com",
                telephone: "+39 0123456789",
                IPACode: "000000"
            },
            // Endpoint ACS: Assertion Consumer Service. In pratica, è l'endpoint (cioè l'URL) del Service Provider
            // dove vengono ricevute le asserzioni SAML dall'Identity Provider dopo che l'utente ha effettuato l'autenticazione.
            // Questo servizio elabora la risposta (la "asserzione") per verificare l'identità dell'utente e completare il processo di login

            // Ora includiamo anche la proprietà "attributes" (vuota se non necessario)
            acs: [{
                binding: "HTTP-POST" as "HTTP-POST",
                location: process.env.SPID_CALLBACK_URL || "http://localhost:3000/api/auth/spid-callback",
                index: "0",
                attributes: []
            }],
            // L'oggetto organization deve essere multilingue, qui forniamo la versione "it".
            organization: {
                it: {
                    name: "MyCompany",
                    displayName: "My Company",
                    url: process.env.SPID_ENTITY_ID || "http://localhost:3000"
                }
            }
        },
        // In produzione, questo campo conterrà i metadata degli IdP ufficiali; qui lo lasciamo vuoto per il PoC.
        IDPRegistryMetadata:idpMetadata, //"https://localhost:8443/metadata.xml",
        // Funzione per determinare l'IdP da utilizzare basata sulla richiesta.
        // getIDPEntityIdFromRequest: (req: any) => process.env.DEFAULT_IDP_ENTITY_ID || "test",
        getIDPEntityIdFromRequest: (req:any) => idp,
        // Il livello di autenticazione: deve essere 1, 2 o 3. Forziamo il literal 1.
        authnContext: 1 as 1
    },
    cache: {
        // Implementazione "dummy": in produzione utilizzare una cache condivisa (es. Redis)
        get: (key: string): Promise<any> => Promise.resolve(null),
        set: (key: string, value: any, expiration?: number): Promise<void> => Promise.resolve(),
        delete: (key: string): Promise<void> => Promise.resolve(),
    },
};

/*
  Creiamo la strategia SPID utilizzando il costruttore di SpidStrategy.
  Essa accetta:
    - L'oggetto di configurazione (spidConfig)
    - Una callback di verifica per il login (signonVerify)
    - Una callback per il logout (logoutVerify)
*/
const strategy = new SpidStrategy(
    spidConfig,
    // Callback di verifica per il login: riceve il profilo SPID e lo passa avanti.
    (profile: any, done: (error: any, user?: any) => void) => {
        return done(null, profile);
    },
    // Callback di verifica per il logout: se non hai logica specifica, chiama semplicemente done(null).
    (req: any, done: (error: any) => void) => {
        return done(null);
    }
);

// Configuriamo Passport per usare la strategia "spid".
passport.use("spid", strategy);

// Serializziamo e deserializziamo l'utente per la gestione delle sessioni (se usate).
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user: any, done) => {
    done(null, user);
});

/*
  Esportiamo una funzione per generare i metadati del Service Provider in formato XML.
  Questi metadati vengono usati dagli IdP (o dagli strumenti di validazione come spid-sp-test)
  per verificare la configurazione del SP.
*/
export const getMetadata = () => {
    return strategy.generateSpidServiceProviderMetadata();
};

export default passport;
