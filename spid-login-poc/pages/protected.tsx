// pages/protected.tsx
import { GetServerSideProps } from 'next';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

interface ProtectedProps {
    user: any;
}

export default function Protected({ user }: ProtectedProps) {
    return (
        <div>
            <h1>Area Protetta</h1>
            <p>Benvenuto, {user.name || user.familyName || 'Utente'}!</p>
            <pre>{JSON.stringify(user, null, 2)}</pre>
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const cookies = context.req.headers.cookie;
    if (!cookies) {
        return {
            redirect: {
                destination: '/api/auth/login',
                permanent: false,
            },
        };
    }

    const parsedCookies = parse(cookies);
    const token = parsedCookies.token;

    if (!token) {
        return {
            redirect: {
                destination: '/api/auth/login',
                permanent: false,
            },
        };
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        return { props: { user } };
    } catch (error) {
        return {
            redirect: {
                destination: '/api/auth/login',
                permanent: false,
            },
        };
    }
};
