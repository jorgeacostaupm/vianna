
export default function buildTestInfoContent(result) {
  const hasInfo =
    result?.descriptionJSX ||
    result?.shortDescription ||
    result?.referenceUrl ||
    result?.applicability ||
    (Array.isArray(result?.reportedMeasures) && result.reportedMeasures.length > 0) ||
    result?.postHoc;

  if (!hasInfo) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {result?.shortDescription && <div>{result.shortDescription}</div>}
      {result?.applicability && (
        <div>
          <b>Applies to:</b> {result.applicability}
        </div>
      )}
      {Array.isArray(result?.reportedMeasures) &&
        result.reportedMeasures.length > 0 && (
          <div>
            <b>Reported measures:</b>
            <ul style={{ margin: "4px 0 0", paddingLeft: "1.1em" }}>
              {result.reportedMeasures.map((measure) => (
                <li key={measure}>{measure}</li>
              ))}
            </ul>
          </div>
        )}
      {result?.postHoc && (
        <div>
          <b>Post hoc:</b> {result.postHoc}
        </div>
      )}
      {result?.referenceUrl && (
        <a
          href={result.referenceUrl}
          target="_blank"
          rel="noreferrer"
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          Reference
        </a>
      )}
      {result?.descriptionJSX && <div>{result.descriptionJSX}</div>}
    </div>
  );
}
