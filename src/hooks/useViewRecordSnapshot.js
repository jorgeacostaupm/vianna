import { useEffect, useMemo, useState } from "react";
import { normalizeOrderValues } from "@/utils/viewRecords";

export default function useViewRecordSnapshot({
  isSync = true,
  liveOrderValues = [],
  initialOrderValues = [],
}) {
  const normalizedLive = useMemo(
    () => normalizeOrderValues(liveOrderValues),
    [liveOrderValues],
  );

  const normalizedInitial = useMemo(
    () => normalizeOrderValues(initialOrderValues),
    [initialOrderValues],
  );

  const [snapshot, setSnapshot] = useState(() =>
    normalizedInitial.length ? normalizedInitial : normalizedLive,
  );

  useEffect(() => {
    if (!isSync) return;
    setSnapshot(normalizedLive);
  }, [isSync, normalizedLive]);

  return isSync ? normalizedLive : snapshot;
}

