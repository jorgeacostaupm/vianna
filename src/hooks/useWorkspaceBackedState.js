import { useCallback, useEffect, useState } from "react";

const isPlainObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

const resolveInitialValue = (defaultValue, persistedValue) => {
  if (isPlainObject(defaultValue) && isPlainObject(persistedValue)) {
    return { ...defaultValue, ...persistedValue };
  }

  return persistedValue ?? defaultValue;
};

export default function useWorkspaceBackedState({
  defaultValue,
  persistedValue,
  onChange,
}) {
  const [value, setValue] = useState(() =>
    resolveInitialValue(defaultValue, persistedValue),
  );

  useEffect(() => {
    if (persistedValue === undefined) return;
    setValue(resolveInitialValue(defaultValue, persistedValue));
  }, [defaultValue, persistedValue]);

  const setWorkspaceValue = useCallback(
    (nextValueOrUpdater) => {
      setValue((previousValue) => {
        const nextValue =
          typeof nextValueOrUpdater === "function"
            ? nextValueOrUpdater(previousValue)
            : nextValueOrUpdater;
        onChange?.(nextValue);
        return nextValue;
      });
    },
    [onChange],
  );

  return [value, setWorkspaceValue];
}
