# SPID_Login_PoC


## Setup locale con Identity Provider SPID simulato
Per sviluppare e testare il flusso SPID in locale è necessario disporre di un Identity Provider SPID simulato.
### *SPID SAML Check*

*SPID SAML Check* è una suita applicativa che fornisce diversi strumenti ai Service Provider SPID, utili per ispezionare le request di autenticazione SAML inviate all'Identity Provider, verificare la correttezza del metadata e inviare response personalizzate al Service Provider. SPID SAML Check è costituito da:
- [spid-sp-test](https://github.com/italia/spid-sp-test), per eseguire i test di conformità alle specifiche SPID
- una web application (_`spid-validator`_) che fornisce una interfaccia grafica per l'esecuzione dei test e l'invio delle response
- una web application (_`spid-demo`_) che implementa un IdP di test per eseguire demo di autenticazione
- un'estensione per Google *Chrome* che permette di intercettare le richieste SAML (deprecata)

*SPID SAML Check* è sviluppato e mantenuto da [AgID - Agenzia per l'Italia Digitale](https://www.agid.gov.it).

#### Quick start con Docker
L'intera suite applicativa è disponibile come immagine Docker pubblicata
su DockerHub [italia/spid-saml-check](https://hub.docker.com/r/italia/spid-saml-check).

Fin da subito è quindi possibile eseguire il container Docker utilizzando
il comando indicato a seguire.

```
# Esecuzione dell'ultima versione
docker run -t -i -p 8443:8443 italia/spid-saml-check

# Esecuzione di una specifica versione
docker run -t -i -p 8443:8443 italia/spid-saml-check:v.1.8.1
```

Così facendo l'applicazione spid-validator è immediatamente disponibile
all'indirizzo https://localhost:8443

Approfondimento: [spid-saml-check](https://github.com/italia/spid-saml-check/tree/master)

## Librerie SPID compatibili con Node.js/TypeScript
Implementare SPID manualmente può essere complesso (bisogna gestire SAML2, firme digitali, certificati, ecc.).
Fortunatamente esistono librerie che astraggono gran parte di questa logica e sono compatibili con Node.js/TypeScript.
La libreria scelta è stata : **passport-spid**

### passport-spid
Una Passport Strategy per SPID di nuova generazione (mantainer indipendente) scritta in TypeScript.
Si basa sugli ultimi aggiornamenti delle librerie SAML (usa node-saml e passport-saml aggiornati) 
e supporta completamente le specifiche SPID.
Offre tipizzazioni TS per i metadata SPID, possibilità di caricare i metadata degli IdP da XML,
e un meccanismo di cache personalizzabile per gestire le AuthnRequest in corso.

Approfondimento: [passport-spid](https://github.com/random42/passport-spid)

## Configurazione del Service Provider (app Next.js)
L’applicazione Next.js deve essere configurata come Service Provider SAML federato con SPID.
Ciò comporta la definizione di una serie di parametri e certificati sia lato SP che lato IdP di test:
- Certificato e chiave privata del SP:  SPID richiede che sia l’AuthnRequest che la Response SAML siano firmate.
Bisogna generare un certificato X.509 (self-signed, in ambiente di test) 
e la corrispondente chiave privata in formato PEM. Per generare il certificato e la relativa chiave privata può essere eseguito il comando:
```bash
openssl req -newkey rsa:2048 -new -x509 -days 365 -nodes -out spid-sp.crt -keyout spid-sp.pem
```
Questi saranno usati dall’app Next.js per firmare le richieste SAML e dichiarati nei metadati SP.
È possibile generare un certificato self-signed con OpenSSL (come indicato in [Avviso SPID n.29 v3],
includendo campi specifici come organizationIdentifier se il SP è una PA. Per la PoC, viene utilizzato un certificato auto-firmato generico.
  

- **Metadati del Service Provider**: è un XML che descrive il nostro SP. Deve includere:
    - **EntityID (issuer)**: un identificativo univoco del SP. Tipicamente si usa un URL (es. la base URL dell’app).
      Nel nostro caso, in locale potrebbe essere http://localhost:3000 oppure un identificativo fittizio.
    - **Assertion Consumer Service (ACS) URL**: l’endpoint dove l’IdP invierà la risposta SAML (Assertion) dopo un login riuscito
      Nel PoC possiamo impostarlo come http://localhost:3000/api/auth/spid/callback (o un percorso dedicato, ad es. /acs).
      Questo path deve corrispondere a una route gestita dall’app SSR che elaborerà il POST di risposta.
    - **Indice del servizio e attributi richiesti**:  SPID permette di richiedere diversi set di attributi utente.
      Nei metadati SP va definito almeno un AttributeConsumingService con un elenco di attributi SPID richiesti
      (codice fiscale, nome, cognome, email, etc.) e un indice numerico associato.
      Ad esempio, l’indice 0 può richiedere un set “minimo” di attributi, l’indice 1 un set esteso.
      Questo indice va comunicato anche nella AuthnRequest.
      Nel PoC, possiamo richiedere il minimo indispensabile (es. fiscalNumber, name, familyName, email) per semplicità.
    - **NameID Format**: SPID richiede l’uso di NameID in formato transient (anziché, ad esempio, email o persistent ID).
      Bisogna assicurarsi che nelle configurazioni SAML del SP il NameIDFormat sia settato a `urn:oasis:names:tc:SAML:2.0:nameid-format:transient`
      altrimenti gli IdP SPID rifiuteranno la richiesta.
    - **Livello di Autenticazione SPID**: SPID prevede 3 livelli (L1, L2, L3) in base alla sicurezza.
      Nella AuthnRequest si specifica l’URL corrispondente al livello richiesto.
      Per test in locale tipicamente si usa SpidL1 (autenticazione base)
      Ad esempio: `authnContext: "https://www.spid.gov.it/SpidL1"` nei parametri di configurazione.
    - **Informazioni sull’organizzazione e contatti**: i metadati includono i dati del fornitore di servizio 
      (nome organizzazione, URL, ecc.) e un riferimento di contatto tecnico/amministrativo.
      Nel caso di enti pubblici (SP “public”), va indicato anche l’IPACode dell’ente pubblico 
      e l’OrganizationIdentifier nel certificato. Se il SP è privato, questi campi possono essere omessi o valorizzati genericamente.
      Nella PoC possiamo inserire valori fittizi (es. “MyCompany” come nome organizzazione)

Esempio di configurazione (semplificata) in JavaScript per una strategia SPID, che riflette quanto sopra:
```javascript
const fs = require("fs");
const SpidStrategy = require("passport-spid").Strategy;

const spidConfig = {
    sp: {
        entityId: "http://localhost:3000",              // Identificativo univoco del SP
        callbackUrl: "http://localhost:3000/acs",         // Endpoint ACS per la SAML Response
        privateCert: fs.readFileSync("spid-sp.pem", "utf8"),// Chiave privata in formato PEM
        certificate: fs.readFileSync("spid-sp.crt", "utf8"),// Certificato pubblico in formato PEM
        attributeConsumingServiceIndex: 0,               // Indice del servizio (es. 0 per il set minimo)
        identifierFormat: "urn:oasis:names:tc:SAML:2.0:nameid-format:transient",
        authnContext: "https://www.spid.gov.it/SpidL1",   // Livello di autenticazione richiesto
        // Possono essere specificati anche algoritmi di firma/digest se necessario, es. SHA-256
        attributes: {
            name: "Required attributes",
            attributes: ["fiscalNumber", "name", "familyName", "email"]
        },
        organization: {
            name: "MyCompany",
            displayName: "My Company",
            URL: "http://localhost:3000"
        }
    },
    // Per spid-sp-test non è necessario configurare un IdP simulato.
    // Dato che spid-sp-test validerà il SP in base ai metadati che genera.
    // Puoi quindi si può omettere la sezione idp oppure lasciarla vuota:
    // idp: {}
    // In caso di utilizzo di idp NON SIMULATI è necessario configurare la sezione idp
    /*
     aruba: {
            entryPoint: "https://idp.aruba.it/sso",       // URL SSO dell'IdP Aruba
            cert: fs.readFileSync("path/to/aruba.crt", "utf8")
        },
    sielte: {
        entryPoint: "https://idp.sieltecloud.it/sso",   // URL SSO dell'IdP Sielte
        cert: fs.readFileSync("path/to/sielte.crt", "utf8")
    }
    // Altri IdP possono essere configurati qui...
    //Alcune librerie permettono di selezionarli dinamicamente in base a un parametro nella richiesta (ad esempio, tramite una query string o un parametro di sessione).
    */
};

passport.use(new SpidStrategy(spidConfig, (profile, done) => {
    // Qui gestisci il profilo utente restituito dall'IdP SPID
    // Esegui eventuale lookup nel database o crea una nuova sessione utente
    return done(null, profile);
}));
```

## Integrazione con Next.js

Con l’ambiente pronto (IdP di test in esecuzione e configurazione SP definita),
si può implementare il flusso di login SPID all’interno dell’app Next.js SSR.
L’approccio è quello tipico di un’app Express con Passport, adattato a Next.js (che utilizza API routes e pagine SSR):

TODO

 
  


