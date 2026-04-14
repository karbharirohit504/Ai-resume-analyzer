import {Link, useNavigate, useParams} from "react-router";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";
import JDMatch from "~/components/JDMatch";

export const meta = () => ([
    { title: 'Resumind | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [jobInfo, setJobInfo] = useState<{
        companyName?: string;
        jobTitle?: string;
        jobDescription?: string;
        resumeTextHint?: string;
    }>({});
    const navigate = useNavigate();

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [isLoading])

    useEffect(() => {
        const loadResume = async () => {
            const resume = await kv.get(`resume:${id}`);

            if(!resume) return;

            const data = JSON.parse(resume);

            const resumeBlob = await fs.read(data.resumePath);
            if(!resumeBlob) return;

            const pdfBlob = new Blob([resumeBlob], { type: 'application/pdf' });
            const resumeUrl = URL.createObjectURL(pdfBlob);
            setResumeUrl(resumeUrl);

            const imageBlob = await fs.read(data.imagePath);
            if(!imageBlob) return;
            const imageUrl = URL.createObjectURL(imageBlob);
            setImageUrl(imageUrl);

            setFeedback(data.feedback);
            setJobInfo({
                companyName: data.companyName,
                jobTitle: data.jobTitle,
                jobDescription: data.jobDescription,
                resumeTextHint: data.resumeTextHint,
            });
            console.log({resumeUrl, imageUrl, feedback: data.feedback });
        }

        loadResume();
    }, [id]);

    return (
        <main className="!pt-0">
        <nav className="resume-nav">
        <Link to="/" className="back-button">
    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
    </Link>
    </nav>
    <div className="flex flex-row w-full max-lg:flex-col-reverse">
    <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
        {imageUrl && resumeUrl && (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
    <img
        src={imageUrl}
    className="w-full h-full object-contain rounded-2xl"
    title="resume"
        />
        </a>
        </div>
)}
    </section>
    <section className="feedback-section">
    <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
    {(jobInfo.companyName || jobInfo.jobTitle || jobInfo.jobDescription) ? (
        <div className="mt-2 bg-white rounded-2xl shadow-md w-full p-4">
            <p className="text-sm text-gray-600">
                Target:{" "}
                <span className="font-semibold text-gray-800">
                    {jobInfo.jobTitle || "—"}
                </span>
                {jobInfo.companyName ? (
                    <>
                        {" "}at{" "}
                        <span className="font-semibold text-gray-800">
                            {jobInfo.companyName}
                        </span>
                    </>
                ) : null}
            </p>
            {jobInfo.jobDescription ? (
                <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-700">
                        Job description used for analysis ({jobInfo.jobDescription.length} chars)
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                        {jobInfo.jobDescription}
                    </pre>
                </details>
            ) : (
                <p className="mt-2 text-sm text-yellow-700">
                    No job description was provided, so the analysis is more generic.
                </p>
            )}
            {jobInfo.resumeTextHint ? (
                <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-700">
                        Resume text extracted ({jobInfo.resumeTextHint.length} chars)
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                        {jobInfo.resumeTextHint}
                    </pre>
                </details>
            ) : null}
        </div>
    ) : null}
    {feedback ? (
        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
        {(jobInfo.jobDescription && feedback.jdMatch && feedback.jdMatch.score === 0) ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-yellow-900">
                <p className="font-semibold">JD match is 0.</p>
                <p className="text-sm mt-1">
                    This commonly happens when the resume text can’t be extracted (scanned/image PDF) or there’s not enough evidence for the JD keywords.
                    Try uploading a text-based PDF, or ensure your resume includes the JD keywords as plain text in Skills/Experience.
                </p>
            </div>
        ) : null}
        <Summary feedback={feedback} />
        <JDMatch feedback={feedback} />
        <ATS
            score={(feedback.jdMatch?.score ?? feedback.ATS.score) || 0}
            suggestions={feedback.ATS.tips || []}
        />
    <Details feedback={feedback} />
        <details className="bg-white rounded-2xl shadow-md w-full p-4">
            <summary className="cursor-pointer text-sm font-semibold text-gray-700">
                Debug: raw feedback JSON
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(feedback, null, 2)}
            </pre>
        </details>
    </div>
    ) : (
        <img src="/images/resume-scan-2.gif" className="w-full" />
    )}
    </section>
    </div>
    </main>
)
}
export default Resume
