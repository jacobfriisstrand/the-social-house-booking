// The file download the export routes return (#123): attachment semantics,
// the content type, and the filename the browser suggests — one shape for
// the CSV and the PDF branches both routes share.
/** The route response that downloads `body` as `filename`. */
export function fileResponse(
  body: ArrayBuffer | string,
  filename: string,
  contentType: string
): Response {
  return new Response(body, {
    headers: {
      "content-disposition": `attachment; filename="${filename}"`,
      "content-type": contentType,
    },
  });
}
