import { predictClient, uploadClient, registerClient } from './api';

export const getPendingBatches = async (stain_type, page = 1, filters = {}) => {
  const { smear_id, chicken_type, startDate, endDate } = filters;
  const response = await uploadClient.get("/batches/prediction/pending", {
    params: { page, stain_type, smear_id, chicken_type, startDate, endDate },
  });
  return response.data;
};

export const fetchImageBlob = async (path) => {
  const res = await uploadClient.get(path.replace(/\\/g, '/'), {
    responseType: 'blob',
  });
  return res.data;
};

// predict หลายรูปพร้อมกัน
export const predictBatch = async (formData) => {
  const { data } = await predictClient.post('/predict-batch', formData);
  return data;
};

export const savePrediction = (payload) =>
  uploadClient.post("/prediction/save", payload);