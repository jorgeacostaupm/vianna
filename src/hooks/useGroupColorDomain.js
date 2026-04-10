import { useMemo } from "react";
import { useSelector } from "react-redux";

import {
  getOrderedGroupsFromDataframe,
  normalizeGroupList,
} from "@/utils/groupColors";

export default function useGroupColorDomain(groupVar, groups = []) {
  const dataframe = useSelector((s) => s.dataframe.dataframe);

  const visibleGroups = useMemo(() => normalizeGroupList(groups), [groups]);

  const navioOrderedGroups = useMemo(
    () => getOrderedGroupsFromDataframe(dataframe, groupVar),
    [dataframe, groupVar],
  );

  const colorDomain = useMemo(() => {
    if (visibleGroups.length === 0) return navioOrderedGroups;

    const seen = new Set(navioOrderedGroups);
    const merged = [...navioOrderedGroups];

    visibleGroups.forEach((group) => {
      if (!seen.has(group)) {
        seen.add(group);
        merged.push(group);
      }
    });

    return merged;
  }, [navioOrderedGroups, visibleGroups]);

  const orderedGroups = useMemo(() => {
    if (visibleGroups.length === 0) return [];

    const visibleSet = new Set(visibleGroups);
    const ordered = colorDomain.filter((group) => visibleSet.has(group));

    if (ordered.length === visibleGroups.length) return ordered;

    const seen = new Set(ordered);
    visibleGroups.forEach((group) => {
      if (!seen.has(group)) ordered.push(group);
    });

    return ordered;
  }, [visibleGroups, colorDomain]);

  return {
    colorDomain,
    orderedGroups,
  };
}

