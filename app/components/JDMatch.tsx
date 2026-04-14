import ScoreCircle from "~/components/ScoreCircle";
import ScoreBadge from "~/components/ScoreBadge";

const KeywordChips = ({
    title,
    keywords,
    variant,
}: {
    title: string;
    keywords: string[];
    variant: "matched" | "missing";
}) => {
    if (!keywords?.length) return null;

    const chipClass =
        variant === "matched"
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-yellow-50 border-yellow-200 text-yellow-700";

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-gray-700">{title}</p>
            <div className="flex flex-wrap gap-2">
                {keywords.map((k) => (
                    <span
                        key={`${variant}:${k}`}
                        className={`px-2 py-1 rounded-full text-sm border ${chipClass}`}
                    >
                        {k}
                    </span>
                ))}
            </div>
        </div>
    );
};

const JDMatch = ({ feedback }: { feedback: Feedback }) => {
    const jd = feedback.jdMatch;
    if (!jd) return null;

    return (
        <div className="bg-white rounded-2xl shadow-md w-full p-4 flex flex-col gap-4">
            <div className="flex flex-row items-center gap-6">
                <ScoreCircle score={jd.score} />
                <div className="flex flex-col gap-1">
                    <div className="flex flex-row items-center gap-2">
                        <h2 className="text-2xl font-bold">JD Match</h2>
                        <ScoreBadge score={jd.score} />
                    </div>
                    <p className="text-sm text-gray-500">
                        Based on explicit evidence in your resume vs the provided job description.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <KeywordChips
                    title="Matched keywords"
                    keywords={(jd.matchedKeywords || []).slice(0, 25)}
                    variant="matched"
                />
                <KeywordChips
                    title="Missing keywords"
                    keywords={(jd.missingKeywords || []).slice(0, 25)}
                    variant="missing"
                />
            </div>

            {jd.missingRequirements?.length ? (
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-gray-700">Top gaps to address</p>
                    <div className="flex flex-col gap-3">
                        {jd.missingRequirements.slice(0, 6).map((gap, idx) => (
                            <div
                                key={`${gap.requirement}:${idx}`}
                                className="rounded-2xl p-4 bg-yellow-50 border border-yellow-200 text-yellow-800"
                            >
                                <div className="flex flex-row items-center justify-between gap-3">
                                    <p className="text-lg font-semibold">{gap.requirement}</p>
                                    <span className="text-xs uppercase tracking-wide font-semibold text-yellow-700">
                                        {gap.priority}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm">{gap.howToAddress}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default JDMatch;

