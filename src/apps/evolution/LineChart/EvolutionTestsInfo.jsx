import React from "react";

import styles from "./EvolutionTestsInfo.module.css";

function formatNumber(value, digits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toFixed(digits);
}

function formatP(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  if (num < 0.001) return "< 0.001";
  return num.toFixed(3);
}

function EffectCard({ title, df1, df2, F, p, eta }) {
  return (
    <div className={styles.effectCard}>
      <div className={styles.effectTitle}>{title}</div>
      <div className={styles.statLine}>
        F({df1}, {df2}) = {formatNumber(F, 2)}
      </div>
      <div className={styles.statLine}>p = {formatP(p)}</div>
      <div className={styles.statLine}>η² = {formatNumber(eta, 3)}</div>
    </div>
  );
}

function RMAnovaBody({ result }) {
  if (!result) return null;

  const {
    dfTime,
    dfGroup,
    dfInteraction,
    dfError,
    Ftime,
    Fgroup,
    Finteraction,
    pTime,
    pGroup,
    pInteraction,
    etaTime,
    etaGroup,
    etaInteraction,
    excludedSubjects,
    groups,
    times,
    cellMeans,
  } = result;

  const hasMeans =
    Array.isArray(groups) &&
    Array.isArray(times) &&
    Array.isArray(cellMeans) &&
    groups.length > 0 &&
    times.length > 0;

  return (
    <>
      <div className={styles.effectGrid}>
        <EffectCard
          title="Time Effect"
          df1={dfTime}
          df2={dfError}
          F={Ftime}
          p={pTime}
          eta={etaTime}
        />
        <EffectCard
          title="Group Effect"
          df1={dfGroup}
          df2={dfError}
          F={Fgroup}
          p={pGroup}
          eta={etaGroup}
        />
        <EffectCard
          title="Group × Time"
          df1={dfInteraction}
          df2={dfError}
          F={Finteraction}
          p={pInteraction}
          eta={etaInteraction}
        />
      </div>

      {excludedSubjects > 0 && (
        <div className={styles.note}>
          {excludedSubjects} subject(s) excluded due to incomplete data.
        </div>
      )}

      {hasMeans && (
        <div className={styles.meansSection}>
          <div className={styles.sectionTitle}>Group × Time Means</div>
          <div className={styles.meansGrid}>
            {groups.map((g, gi) => {
              const name = g ?? "All";
              return (
                <div key={`${name}-${gi}`} className={styles.meanGroup}>
                  <div className={styles.meanGroupTitle}>{name}</div>
                {times.map((t, ti) => (
                  <div key={`${g}-${t}`} className={styles.meanRow}>
                    <span>{t}</span>
                    <span>{formatNumber(cellMeans?.[gi]?.[ti], 2)}</span>
                  </div>
                ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function renderGroupStats(testId, result) {
  if (!result) return null;

  if (testId === "friedman-test") {
    return (
      <div className={styles.statGrid}>
        <div className={styles.statItem}>
          χ²({result.df}) = {formatNumber(result.statistic, 2)}
        </div>
        <div className={styles.statItem}>p = {formatP(result.pValue)}</div>
      </div>
    );
  }

  if (testId === "mauchly-test") {
    return (
      <div className={styles.statGrid}>
        <div className={styles.statItem}>
          W = {formatNumber(result.statistic, 4)}
        </div>
        <div className={styles.statItem}>p = {formatP(result.pValue)}</div>
        <div className={styles.statItem}>
          ε<sub>GG</sub> = {formatNumber(result.epsilonGG, 3)}
        </div>
        <div className={styles.statItem}>
          ε<sub>HF</sub> = {formatNumber(result.epsilonHF, 3)}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.statGrid}>
      <div className={styles.statItem}>
        {result.statisticName || "Stat"} ={" "}
        {formatNumber(result.statistic, 3)}
      </div>
      {result.df != null && (
        <div className={styles.statItem}>df = {result.df}</div>
      )}
      <div className={styles.statItem}>p = {formatP(result.pValue)}</div>
    </div>
  );
}

function PerGroupBody({ testId, result }) {
  const groups = result?.groups || [];
  if (!groups.length) return null;

  return (
    <div className={styles.groupList}>
      {groups.map((group, index) => (
        <div
          key={`${group.group ?? "group"}-${index}`}
          className={styles.groupCard}
        >
          <div className={styles.groupHeader}>
            <div className={styles.groupName}>{group.group ?? "All"}</div>
            <div className={styles.groupMeta}>
              n = {group.n}, k = {group.k}
            </div>
          </div>

          {group.error ? (
            <div className={styles.error}>{group.error}</div>
          ) : (
            renderGroupStats(testId, group.result)
          )}

          {group.excluded > 0 && (
            <div className={styles.note}>
              {group.excluded} subject(s) excluded due to incomplete data.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LmmBody({ result }) {
  if (!result) return null;

  const fixedEffects = Array.isArray(result.fixedEffects) ? result.fixedEffects : [];
  const variance = result.variance || {};
  const timeEffect = result?.wald?.time;
  const metadata = result?.metadata || {};
  const warnings = Array.isArray(result.warnings)
    ? result.warnings
    : result.warning
      ? [result.warning]
      : [];

  return (
    <>
      {warnings.map((warning, index) => (
        <div key={`${warning}-${index}`} className={styles.note}>
          {warning}
        </div>
      ))}

      <div className={styles.effectGrid}>
        <div className={styles.effectCard}>
          <div className={styles.effectTitle}>Main Time Test (Wald)</div>
          <div className={styles.statLine}>
            β = {formatNumber(timeEffect?.estimate, 4)}
          </div>
          <div className={styles.statLine}>
            Wald = {formatNumber(timeEffect?.wald, 3)}
          </div>
          <div className={styles.statLine}>
            z = {formatNumber(timeEffect?.statistic, 3)}
          </div>
          <div className={styles.statLine}>p = {formatP(timeEffect?.pValue)}</div>
        </div>

        <div className={styles.effectCard}>
          <div className={styles.effectTitle}>Variance Components</div>
          <div className={styles.statLine}>
            Var(u) = {formatNumber(variance.randomIntercept, 4)}
          </div>
          <div className={styles.statLine}>
            Var(ε) = {formatNumber(variance.residual, 4)}
          </div>
          <div className={styles.statLine}>
            ICC = {formatNumber(variance.icc, 3)}
          </div>
        </div>

        <div className={styles.effectCard}>
          <div className={styles.effectTitle}>Model Metadata</div>
          <div className={styles.statLine}>
            Subjects used = {metadata.subjectsUsed ?? result.nSubjects ?? "—"}
          </div>
          <div className={styles.statLine}>
            Observations used ={" "}
            {metadata.observationsUsed ?? result.nObservations ?? "—"}
          </div>
          <div className={styles.statLine}>
            Groups count = {metadata.groupsCount ?? result.nGroups ?? "—"}
          </div>
          <div className={styles.statLine}>
            Method = {result.method || "REML"}
          </div>
          <div className={styles.statLine}>
            Time coding = {metadata.timeCoding || result.timeCoding || "ordered-index"}
          </div>
          <div className={styles.statLine}>
            Group reference = {metadata.groupReference || result.referenceGroup || "—"}
          </div>
          <div className={styles.statLine}>
            Converged = {(metadata.converged ?? result.converged) ? "yes" : "no"}
          </div>
        </div>
      </div>

      {result?.filteredData && (
        <div className={styles.note}>
          Rows: {result.filteredData.rowsBeforeFiltering} initial,{" "}
          {result.filteredData.rowsAfterCompleteCase} after complete-case,{" "}
          {result.filteredData.rowsAfterSubjectFilter} after subject filter. Subjects:{" "}
          {result.filteredData.subjectsAfterFilter}.
        </div>
      )}

      {!!fixedEffects.length && (
        <div className={styles.meansSection}>
          <div className={styles.sectionTitle}>Fixed Effects</div>
          <div className={styles.tableWrap}>
            <table className={styles.effectsTable}>
              <thead>
                <tr>
                  <th>Term</th>
                  <th>Estimate</th>
                  <th>SE</th>
                  <th>p</th>
                  <th>CI95%</th>
                </tr>
              </thead>
              <tbody>
                {fixedEffects.map((effect) => (
                  <tr key={effect.name}>
                    <td>{effect.name}</td>
                    <td>{formatNumber(effect.estimate, 4)}</td>
                    <td>{formatNumber(effect.se, 4)}</td>
                    <td>{formatP(effect.pValue)}</td>
                    <td>
                      [{formatNumber(effect.ci95?.lower, 2)},{" "}
                      {formatNumber(effect.ci95?.upper, 2)}]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </>
  );
}

export default function EvolutionTestsInfo({ tests = [] }) {
  if (!tests.length) return null;

  return (
    <div className={styles.root}>
      {tests.map((test) => {
        const error = test.error || test.result?.error;
        const meta = [];
        if (test.result?.subjects != null) {
          meta.push(`n = ${test.result.subjects}`);
        }
        if (test.result?.times?.length != null) {
          meta.push(`k = ${test.result.times.length}`);
        }
        if (
          test.variant === "paired" &&
          Array.isArray(test.result?.pairTimes) &&
          test.result.pairTimes.length === 2
        ) {
          meta.push(
            `t = ${test.result.pairTimes[0]} → ${test.result.pairTimes[1]}`
          );
        }
        if (test.variant === "lmm") {
          if (test.result?.nSubjects != null) {
            meta.push(`subjects = ${test.result.nSubjects}`);
          }
          if (test.result?.nObservations != null) {
            meta.push(`obs = ${test.result.nObservations}`);
          }
          if (test.result?.nGroups != null) {
            meta.push(`groups = ${test.result.nGroups}`);
          }
        }

        return (
          <div key={test.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardTitle}>{test.label}</div>
                {meta.length > 0 && (
                  <div className={styles.cardMeta}>{meta.join(" • ")}</div>
                )}
              </div>
            </div>

            {test.description && (
              <div className={styles.cardDesc}>{test.description}</div>
            )}

            {test.referenceUrl && (
              <a
                className={styles.referenceLink}
                href={test.referenceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Reference
              </a>
            )}

            {error ? (
              <div className={styles.error}>{error}</div>
            ) : test.variant === "rm-anova" ? (
              <RMAnovaBody result={test.result} />
            ) : test.variant === "lmm" ? (
              <LmmBody result={test.result} />
            ) : (
              <PerGroupBody testId={test.id} result={test.result} />
            )}
          </div>
        );
      })}
    </div>
  );
}
