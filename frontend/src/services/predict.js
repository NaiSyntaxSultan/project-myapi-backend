import { predictClient } from './api';

export const predictBloodCell9k = async (imageFile, mode) => {
  const formData = new FormData();
  formData.append('mode', mode);
  formData.append('image', imageFile);

  const { data } = await predictClient.post('/predict', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const predictBloodCell4kr = async (imageFile, mode) => {
  const formData = new FormData();
  formData.append('mode', mode);
  formData.append('image', imageFile);

  const { data } = await predictClient.post('/predict', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};