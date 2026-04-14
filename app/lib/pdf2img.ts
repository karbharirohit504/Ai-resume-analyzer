import * as pdfjsLib from "pdfjs-dist";

export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

export async function extractPdfText(
    file: File,
    {
        maxPages = 2,
        maxChars = 6000,
    }: { maxPages?: number; maxChars?: number } = {}
): Promise<string> {
    try {
        if (typeof window === "undefined") return "";

        if (pdfjsLib?.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const pageCount = Math.min(maxPages, pdf.numPages || 1);
        let out = "";

        for (let i = 1; i <= pageCount; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = (content.items as Array<{ str?: string }>)
                .map((it) => (typeof it?.str === "string" ? it.str : ""))
                .join(" ")
                .replace(/[ \t]{2,}/g, " ")
                .trim();

            if (pageText) {
                out += (out ? "\n\n" : "") + pageText;
                if (out.length >= maxChars) break;
            }
        }

        if (out.length > maxChars) out = out.slice(0, maxChars);
        return out.trim();
    } catch {
        return "";
    }
}

export async function convertPdfToImage(file: File): Promise<PdfConversionResult> {
    try {
        if (typeof window === "undefined") {
            return {
                imageUrl: "",
                file: null,
                error: "PDF conversion is only available in the browser",
            };
        }

        // ✅ Worker served from /public (only in browser)
        if (pdfjsLib?.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);

        // Keep memory bounded; large canvases can crash the tab.
        const MAX_DIMENSION_PX = 2200;
        const BASE_SCALE = 2;
        const baseViewport = page.getViewport({ scale: BASE_SCALE });
        const scaleFactor = Math.min(
            1,
            MAX_DIMENSION_PX / baseViewport.width,
            MAX_DIMENSION_PX / baseViewport.height
        );
        const viewport = page.getViewport({ scale: BASE_SCALE * scaleFactor });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (context) {
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";
        }

        await page.render({ canvasContext: context!, viewport }).promise;

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const originalName = file.name.replace(/\.pdf$/i, "");
                        const imageFile = new File([blob], `${originalName}.png`, {
                            type: "image/png",
                        });

                        resolve({
                            imageUrl: URL.createObjectURL(blob),
                            file: imageFile,
                        });
                    } else {
                        resolve({
                            imageUrl: "",
                            file: null,
                            error: "Failed to create image blob",
                        });
                    }
                },
                "image/png",
                1.0
            );
        });
    } catch (err) {
        return {
            imageUrl: "",
            file: null,
            error: `Failed to convert PDF: ${err}`,
        };
    }
}
