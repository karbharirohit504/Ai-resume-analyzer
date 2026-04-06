import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import {resumes} from "../../constants";
import {resume} from "react-dom/server";
import Resumecard from "~/components/Resumecard";
import {useLocation, useNavigate} from "react-router-dom";
import {usePuterStore} from "~/lib/puter";
import {useEffect} from "react";
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "smart and fast feedback for your dream job" },
  ];
}

export default function Home() {
    const { auth } = usePuterStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (auth.isAuthenticated) navigate('/auth?next=/');
    }, [auth.isAuthenticated]);


    return <main className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-cove">
        <Navbar/>

        <section className="main-section">
            <div className="page-heading py-16">
                <h1>Track Your Application & Resume Rating</h1>
                <h2>Review Your Submissions and Check AI-powered Feedback.</h2>

            </div>

        {resumes.length > 0 && (
            <div className="resumes-section">
                {resumes.map((resume) => (
                    <Resumecard key={resume.id} resume={resume}/>
                ))}
            </div>
        )}
        </section>
    </main>
}