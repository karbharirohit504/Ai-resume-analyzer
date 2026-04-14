import {type FormEvent, useState} from 'react'
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/puter";
import {useNavigate} from "react-router";
import {generateUUID} from "~/lib/utils";
import {prepareInstructions} from "../../constants";

const normalizeJobDescription = (raw: string) => {
    const cleaned = (raw || "")
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();

    const maxChars = 6000;
    if (cleaned.length <= maxChars) return cleaned;

    return `${cleaned.slice(0, maxChars)}\n\n[Job description truncated to first ${maxChars} characters for analysis.]`;
};

const normalizeResumeTextHint = (raw: string) => {
    const cleaned = (raw || "")
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();

    const maxChars = 3500;
    if (!cleaned) return "";
    if (cleaned.length <= maxChars) return cleaned;
    return `${cleaned.slice(0, maxChars)}\n\n[Resume text truncated for analysis.]`;
};

const Upload = () => {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleFileSelect = (file: File | null) => {
        setFile(file)
    }

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File  }) => {
        setIsProcessing(true);
        setStatusText("");

        try {
            if (!auth.isAuthenticated) {
                navigate(`/auth?next=/upload`);
                return;
            }

            setStatusText('Uploading the file...');
            const uploadedFile = await fs.upload([file]);
            if(!uploadedFile) throw new Error('Failed to upload file');

            setStatusText('Converting to image...');
            const { convertPdfToImage } = await import("~/lib/pdf2img");
            const imageFile = await convertPdfToImage(file);
            if(!imageFile.file) throw new Error(imageFile.error || 'Failed to convert PDF to image');

            let resumeTextHint = "";
            try {
                setStatusText('Extracting resume text...');
                const { extractPdfText } = await import("~/lib/pdf2img");
                const pdfText = await extractPdfText(file, { maxPages: 2, maxChars: 6000 });

                if (pdfText && pdfText.length > 200) {
                    resumeTextHint = normalizeResumeTextHint(pdfText);
                } else {
                    // If the PDF is scanned/image-based, text extraction returns little/empty text.
                    // OCR the first page image and pass it as a hint to improve JD matching.
                    const ocrText = await ai.img2txt(imageFile.file);
                    if (ocrText) resumeTextHint = normalizeResumeTextHint(ocrText);
                }
            } catch (err) {
                console.warn("OCR failed", err);
            }

            setStatusText('Uploading the image...');
            const uploadedImage = await fs.upload([imageFile.file]);
            if(!uploadedImage) throw new Error('Failed to upload image');

            setStatusText('Preparing data...');
            const uuid = generateUUID();
            const data = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName, jobTitle, jobDescription,
                resumeTextHint,
                feedback: '',
            }
            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            setStatusText('Analyzing...');
            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({
                    jobTitle,
                    jobDescription: normalizeJobDescription(jobDescription),
                    resumeText: resumeTextHint || undefined,
                })
            )
            if (!feedback) throw new Error('Failed to analyze resume');

            const feedbackText = typeof feedback.message.content === 'string'
                ? feedback.message.content
                : feedback.message.content?.[0]?.text;

            if (!feedbackText) {
                throw new Error("AI response was empty");
            }

            try {
                data.feedback = JSON.parse(feedbackText);
            } catch {
                throw new Error("AI returned non-JSON output; try again or shorten the job description");
            }

            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            setStatusText('Analysis complete, redirecting...');
            navigate(`/resume/${uuid}`);
        } catch (err) {
            console.error(err);
            const msg = err instanceof Error ? err.message : "Unknown error";
            setStatusText(`Error: ${msg}`);
            setIsProcessing(false);
        }
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if(!form) return;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if(!file) return;

        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}
                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text" name="company-name" placeholder="Company Name" id="company-name" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" name="job-title" placeholder="Job Title" id="job-title" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} name="job-description" placeholder="Job Description" id="job-description" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            <button className="primary-button" type="submit">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}
export default Upload
