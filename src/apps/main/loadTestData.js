import { updateData } from "@/store/async/dataAsyncReducers";
import {
  updateDescriptions,
  updateHierarchy,
} from "@/store/async/metaAsyncReducers";
import * as api from "@/services/cantabAppServices";
import { setIdVar } from "@/store/slices/cantabSlice";
import { DATASETS } from "@/utils/Constants";
import { notifyError } from "@/utils/notifications";

const { dataPath, hierarchyPath, descriptionsPath, idVar } = import.meta.env
  .PROD
  ? DATASETS.prod
  : DATASETS.dev;

export default async function loadTestData(dispatch) {
  try {
    let data = await api.fetchTestData(dataPath);
    await dispatch(
      updateData({
        data,
        isGenerateHierarchy: true,
        filename: dataPath,
      }),
    );

    let hierarchy = await api.fetchHierarchy(hierarchyPath);
    await dispatch(updateHierarchy({ hierarchy, filename: hierarchyPath }));

    let descriptions = await api.fetchDescriptionsCSV(descriptionsPath);
    await dispatch(
      updateDescriptions({
        descriptions,
        filename: descriptionsPath,
      }),
    );

    dispatch(setIdVar(idVar));

    return true;
  } catch (error) {
    notifyError({
      message: "Could not load test data",
      error,
      fallback: "An error occurred while loading demo files.",
    });
    return false;
  }
}
