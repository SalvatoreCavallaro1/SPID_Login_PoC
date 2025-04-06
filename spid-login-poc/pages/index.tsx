// pages/index.tsx
import Link from 'next/link';

export default function Home() {
    return (
        <div>
            <h1>SPID Login PoC</h1>
    <p>
    Per accedere, effettua il <Link href="/api/auth/login">login con SPID</Link>.
    </p>
    <p>
    Visualizza i <Link href="/api/auth/metadata">metadati del Service Provider</Link>.
    </p>
    </div>
);
}
