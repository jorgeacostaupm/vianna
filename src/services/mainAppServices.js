import * as aq from "arquero";

export const fetchScenarioRunData = async (id) => {
  const response = await fetch(`/server/api/vis/scenarioruncantab/${id}/`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export const fetchDefaultHierarchy = async () => {
  const response = await fetch("./vis/hierarchies/default_hierarchy_v1.1.json");
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export const fetchHierarchy = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export const fetchTestData = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const csvText = await response.text();

  const data = Array.from({ length: 1 }, () =>
    aq.fromCSV(csvText).objects(),
  ).flat();

  return data;
};

export const fetchAvailablePopulations = async (token) => {
  const headers = token ? { Authorization: `Token ${token}` } : {};
  const response = await fetch("/server/api/vis/availablecantabpopulations/", {
    headers: { "Content-Type": "application/json", ...headers },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export const fetchDescriptionsCSV = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  const csvText = await response.text();

  return csvText;
};
