import * as aq from "arquero";
import { PROCESSORS } from "../apps/hierarchy/menu/logic/formulaConstants.js";

const string = (value) =>
  value == null ? "" : aq?.op?.string ? aq.op.string(value) : String(value);
const lower = (value) => string(value).toLowerCase();
const upper = (value) => string(value).toUpperCase();
const trim = (value) => string(value).trim();
const substring = (value, start, length) => {
  const text = string(value);
  const from = Number(start) || 0;
  if (length == null || Number.isNaN(Number(length))) {
    return text.substring(from);
  }
  return text.substring(from, from + Number(length));
};

const sqrt = (value) => Math.sqrt(value);
const abs = (value) => Math.abs(value);
const cbrt = (value) => Math.cbrt(value);
const ceil = (value) => Math.ceil(value);
const clz32 = (value) => Math.clz32(value);
const exp = (value) => Math.exp(value);
const expm1 = (value) => Math.expm1(value);
const floor = (value) => Math.floor(value);
const fround = (value) => Math.fround(value);
const log = (value) => Math.log(value);
const log10 = (value) => Math.log10(value);
const log1p = (value) => Math.log1p(value);
const log2 = (value) => Math.log2(value);
const pow = (base, exponent) => Math.pow(base, exponent);
const round = (value) => Math.round(value);
const sign = (value) => Math.sign(value);
const trunc = (value) => Math.trunc(value);

const toDate = (value) => {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const now = () => Date.now();
const timestamp = (value) => {
  const date = toDate(value);
  return date ? date.getTime() : null;
};

const datetime = (
  year,
  month,
  day,
  hours = 0,
  minutes = 0,
  seconds = 0,
  milliseconds = 0,
) => {
  if (year == null) return null;
  const y = Number(year);
  const m = Number(month ?? 1) - 1;
  const d = Number(day ?? 1);
  const h = Number(hours ?? 0);
  const min = Number(minutes ?? 0);
  const s = Number(seconds ?? 0);
  const ms = Number(milliseconds ?? 0);
  return new Date(y, m, d, h, min, s, ms).getTime();
};

const year = (value) => {
  const date = toDate(value);
  return date ? date.getFullYear() : null;
};
const quarter = (value) => {
  const date = toDate(value);
  return date ? Math.floor(date.getMonth() / 3) + 1 : null;
};
const month = (value) => {
  const date = toDate(value);
  return date ? date.getMonth() + 1 : null;
};
const week = (value) => {
  const date = toDate(value);
  if (!date) return null;
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};
const date = (value) => {
  const d = toDate(value);
  return d ? d.getDate() : null;
};
const dayofyear = (value) => {
  const d = toDate(value);
  if (!d) return null;
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  return Math.floor(diff / 86400000);
};
const dayofweek = (value) => {
  const d = toDate(value);
  return d ? d.getDay() : null;
};
const hours = (value) => {
  const d = toDate(value);
  return d ? d.getHours() : null;
};
const minutes = (value) => {
  const d = toDate(value);
  return d ? d.getMinutes() : null;
};
const seconds = (value) => {
  const d = toDate(value);
  return d ? d.getSeconds() : null;
};
const milliseconds = (value) => {
  const d = toDate(value);
  return d ? d.getMilliseconds() : null;
};

const greatest = (...args) => {
  const values = args.filter((v) => v != null && v !== "");
  if (values.length === 0) return null;
  return Math.max(...values);
};
const least = (...args) => {
  const values = args.filter((v) => v != null && v !== "");
  if (values.length === 0) return null;
  return Math.min(...values);
};

const FORMULA_FUNCTIONS = {
  string,
  lower,
  upper,
  trim,
  substring,
  sqrt,
  abs,
  cbrt,
  ceil,
  clz32,
  exp,
  expm1,
  floor,
  fround,
  log,
  log10,
  log1p,
  log2,
  pow,
  round,
  sign,
  trunc,
  now,
  timestamp,
  datetime,
  year,
  quarter,
  month,
  week,
  date,
  dayofyear,
  dayofweek,
  hours,
  minutes,
  seconds,
  milliseconds,
  greatest,
  least,
};
const FORMULA_FUNCTION_NAMES = Object.keys(FORMULA_FUNCTIONS);

function extractExpression(formula) {
  return formula.startsWith("(r) => ") ? formula.substring(7) : formula;
}

function compileFormulaEvaluator(expression, specialIds = []) {
  const fnBindings = FORMULA_FUNCTION_NAMES.join(", ");
  return new Function(
    "r",
    "fns",
    ...specialIds,
    `"use strict"; const { ${fnBindings} } = fns; return (${expression});`,
  );
}

// ==================== REGISTRO DE PROCESADORES ESPECIALES ====================

/**
 * Registro centralizado de procesadores de funciones especiales
 * Cada procesador debe tener:
 * - name: nombre de la función
 * - pattern: regex para identificar la función en la fórmula
 * - processor: función que recibe (match, table) y devuelve una función (row) => valor
 */
const SPECIAL_PROCESSORS = [
  {
    name: "zscoreByGroup",
    pattern: /__GROUPED_ZSCORE__\("(.+?)","(.+?)"\)/g,
    processor: (match, table) => {
      const colName = match[1];
      const groupCol = match[2];
      const groupedResult = PROCESSORS.zscoreByGroup(table, colName, groupCol);
      const { statsMap } = groupedResult;

      return (row) => {
        const groupValue = row[groupCol];
        const value = row[colName];
        const groupStats = statsMap[groupValue];

        if (!groupStats || groupStats.stdev === 0 || groupStats.count <= 1) {
          return 0;
        }

        return (value - groupStats.mean) / groupStats.stdev;
      };
    },
  },
  {
    name: "zscore",
    pattern: /__ZSCORE__\("(.+?)"\)/g,
    processor: (match, table) => {
      const colName = match[1];
      const result = PROCESSORS.zscore(table, colName);
      const { mean, stdev } = result;

      return (row) => {
        const value = row[colName];
        if (stdev === 0) return 0;
        return (value - mean) / stdev;
      };
    },
  },
  {
    name: "zscoreByValues",
    pattern: /__ZSCORE_BY_VALUES__\("(.+?)",\s*([\d.]+),\s*([\d.]+)\)/g,
    processor: (match) => {
      const colName = match[1];
      const mean = +match[2];
      const stdev = +match[3];

      return (row) => {
        const value = row[colName];
        if (stdev === 0) return 0;
        return (value - mean) / stdev;
      };
    },
  },
  // Para agregar nuevas funciones especiales en el futuro, añadir aquí:
  // {
  //   name: 'miNuevaFuncion',
  //   pattern: /__MI_NUEVA_FUNCION__\("(.+?)","(.+?)"\)/g,
  //   processor: (match, table) => { ... }
  // }
];

// ==================== MÓDULOS DE PROCESAMIENTO ====================

/**
 * Procesa todas las funciones especiales en una fórmula
 */
function processSpecialFunctions(formula, table) {
  let formulaProcessed = formula;
  const specialFunctions = [];

  SPECIAL_PROCESSORS.forEach((processor) => {
    const matches = [...formulaProcessed.matchAll(processor.pattern)];

    // Reiniciar el índice del regex (importante cuando se usa flag 'g')
    processor.pattern.lastIndex = 0;

    matches.forEach((match) => {
      const fullMatch = match[0];

      // Crear la función especializada usando el procesador
      const derivedFn = processor.processor(match, table);

      // Generar un ID único para esta función
      const functionId = `__SPECIAL_FN_${specialFunctions.length}__`;

      // Guardar la función y reemplazar en la fórmula
      specialFunctions.push({
        id: functionId,
        fn: derivedFn,
        type: processor.name,
      });

      formulaProcessed = formulaProcessed.replace(fullMatch, functionId);
    });
  });

  return { formulaProcessed, specialFunctions };
}

/**
 * Procesa funciones de agregación estándar (__AGG__)
 */
function processAggregationFunctions(formula, table) {
  let formulaProcessed = formula;
  const aggMatches = [
    ...formulaProcessed.matchAll(/__AGG__\("(.+?)","(.+?)"\)/g),
  ];

  aggMatches.forEach((match) => {
    const fullMatch = match[0];
    const funcName = match[1];
    const col = match[2];

    if (!PROCESSORS[funcName]) {
      throw {
        error: "UnknownFunction",
        msg: `Function "${funcName}" is not defined in SPECIAL_FUNCTIONS`,
      };
    }

    const value = PROCESSORS[funcName](table, col);
    formulaProcessed = formulaProcessed.replace(fullMatch, value);
  });

  return formulaProcessed;
}

/**
 * Crea una función combinada que evalúa múltiples funciones especiales
 */
function createCombinedFunction(formula, specialFunctions) {
  const expression = extractExpression(formula);
  const specialIds = specialFunctions.map((specialFn) => specialFn.id);
  const evaluator = compileFormulaEvaluator(expression, specialIds);

  return (row) => {
    const specialValues = specialFunctions.map(({ fn }) => fn(row));
    return evaluator(row, FORMULA_FUNCTIONS, ...specialValues);
  };
}

// ==================== FUNCIÓN PRINCIPAL MODULAR ====================

/**
 * Procesa una fórmula, manejando funciones especiales y de agregación
 */
export default function processFormula(table, formula) {
  // Paso 1: Procesar funciones especiales (zscore, zscoreByGroup, etc.)
  const { formulaProcessed: formulaAfterSpecial, specialFunctions } =
    processSpecialFunctions(formula, table);

  // Paso 2: Procesar funciones de agregación estándar (__AGG__)
  const finalFormula = processAggregationFunctions(formulaAfterSpecial, table);

  // Paso 3: Construir función final según lo que se encontró
  if (specialFunctions.length > 0) {
    // Si hay funciones especiales, crear una función combinada
    const combinedFn = createCombinedFunction(finalFormula, specialFunctions);
    return aq.escape(combinedFn);
  } else {
    // Si no hay funciones especiales, compilar una única función para cada fila.
    const expression = extractExpression(finalFormula);
    const evaluator = compileFormulaEvaluator(expression);
    return aq.escape((r) => evaluator(r, FORMULA_FUNCTIONS));
  }
}

// ==================== EJEMPLOS DE USO PARA FUTURAS EXTENSIONES ====================

/**
 * Ejemplo: Cómo agregar una nueva función especial "normalizeByGroup"
 */
// export function setupNormalizeByGroup() {
//   // Primero, agregar la función a SPECIAL_FUNCTIONS en formulaGenerator.js
//   // Luego registrar el procesador:
//   registerSpecialProcessor(
//     'normalizeByGroup',
//     '__NORMALIZE_BY_GROUP__\\("(.+?)","(.+?)"\\)',
//     (match, table) => {
//       const colName = match[1];
//       const groupCol = match[2];
//
//       // Lógica para calcular min/max por grupo
//       const groupStats = SPECIAL_FUNCTIONS.normalizeByGroup(table, colName, groupCol);
//
//       return (row) => {
//         const groupValue = row[groupCol];
//         const value = row[colName];
//         const stats = groupStats[groupValue];
//
//         if (!stats || stats.max === stats.min) return 0;
//         return (value - stats.min) / (stats.max - stats.min);
//       };
//     }
//   );
// }
