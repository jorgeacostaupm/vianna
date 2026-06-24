import { anova } from "./numerical/ANOVA";
import { welschAnova } from "./numerical/ANOVA_Welsh";
import { kruskalWallis } from "./numerical/Kruskal_Wallis";
import { tTest } from "./numerical/StudentT";
import { welchTest } from "./numerical/WelschT";
import { mannWhitney } from "./numerical/Mann_Whitney_U";

import { chiSquareIndependence } from "./categorical/ChiSquared";

const testMeta = {
  "anova-one-way": {
    shortDescription: "Compares means of k independent groups with ANOVA.",
    applicability: "Numerical attribute, 2 or more independent groups.",
    reportedMeasures: [
      "F statistic and p-value",
      "Effect size eta squared (η²)",
      "Group means with 95% CI",
      "Pairwise Cohen's d with 95% CI and pairwise t-test p-values",
    ],
    postHoc:
      "Pairwise t-tests are computed across groups with unadjusted p-values (no multiple-comparison correction).",
    referenceUrl:
      "https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/onewayan.htm",
  },
  "anova-welch": {
    shortDescription: "One-way ANOVA without assuming equal variances (Welch).",
    applicability: "Numerical attribute, 2 or more independent groups.",
    reportedMeasures: [
      "Welch F statistic and p-value",
      "Global effect size omega squared (ω²), SS-based",
      "Group means with t-based 95% CI",
      "Pairwise Hedges' g with 95% CI and pairwise Welch t-test p-values",
    ],
    postHoc:
      "Pairwise Welch t-tests are computed across groups with Holm-adjusted p-values (family-wise error control).",
    referenceUrl:
      "https://poc.vl-e.nl/distribution/manual/R-2.2.0/library/stats/html/oneway.test.html",
  },
  "kruskal-wallis-test": {
    shortDescription:
      "Non-parametric alternative to ANOVA for k independent groups.",
    applicability: "Numerical attribute, 2 or more independent groups.",
    reportedMeasures: [
      "H statistic and p-value",
      "Effect size epsilon H squared (εH²)",
      "Group medians with bootstrap 95% CI",
      "Pairwise rank-biserial r with 95% CI",
    ],
    postHoc:
      "Pairwise rank comparisons are computed using a z statistic with Bonferroni-adjusted p-values (Dunn-style).",
    referenceUrl:
      "https://search.r-project.org/R/refmans/stats/html/kruskal.test.html",
  },
  "t-test-independent": {
    shortDescription:
      "Compares means of two independent groups (Student's t-test).",
    applicability: "Numerical attribute, exactly 2 independent groups.",
    reportedMeasures: [
      "t statistic and p-value",
      "Mean difference with 95% CI",
      "Group means with 95% CI",
      "Effect size Cohen's d with 95% CI",
    ],
    postHoc: "Not applicable (single two-group comparison).",
    referenceUrl:
      "https://search.r-project.org/CRAN/refmans/stats/html/t.test.html",
  },
  "t-test-welch": {
    shortDescription: "Two-sample t-test with unequal variances (Welch).",
    applicability: "Numerical attribute, exactly 2 independent groups.",
    reportedMeasures: [
      "Welch t statistic and p-value",
      "Mean difference with 95% CI",
      "Group means with 95% CI",
      "Effect size Cohen's d with 95% CI",
    ],
    postHoc: "Not applicable (single two-group comparison).",
    referenceUrl:
      "https://search.r-project.org/CRAN/refmans/stats/html/t.test.html",
  },
  "mann-whitney-u": {
    shortDescription: "Non-parametric comparison of two independent groups.",
    applicability: "Numerical attribute, exactly 2 independent groups.",
    reportedMeasures: [
      "U statistic, z approximation and p-value",
      "Group medians with bootstrap 95% CI",
      "Effect size rank-biserial r with 95% CI",
    ],
    postHoc: "Not applicable (single two-group comparison).",
    referenceUrl:
      "https://web.mit.edu/r/current/lib/R/library/stats/html/wilcox.test.html",
  },
  "yuen-t-test": {
    shortDescription: "Robust comparison using trimmed means (Yuen).",
    referenceUrl:
      "https://mirror.las.iastate.edu/CRAN/web/packages/WRS2/refman/WRS2.html",
  },
  "chi-square-independence": {
    shortDescription: "Chi-square test of independence for contingency tables.",
    applicability: "Categorical attribute, 2 or more groups and 2 or more categories.",
    reportedMeasures: [
      "Chi-square statistic (χ²), degrees of freedom and p-value",
      "Global effect size Cramer's V",
      "Group category counts",
      "Pairwise Cramer's V with bootstrap 95% CI",
    ],
    postHoc:
      "Pairwise chi-square tests are computed across group pairs with unadjusted p-values (no multiple-comparison correction).",
    referenceUrl:
      "https://itl.nist.gov/div898/software/dataplot/refman1/auxillar/chistest.htm",
  },
};

const tests = [
  anova,
  welschAnova,
  kruskalWallis,
  tTest,
  welchTest,
  mannWhitney,

  chiSquareIndependence,
];

const enrichedTests = tests.map((test) => {
  const meta = testMeta[test.id] || {};
  return {
    ...test,
    shortDescription: meta.shortDescription ?? test.description ?? "",
    applicability: meta.applicability ?? "",
    reportedMeasures: meta.reportedMeasures ?? [],
    postHoc: meta.postHoc ?? "Not specified.",
    referenceUrl: meta.referenceUrl ?? "",
  };
});

export default enrichedTests;
