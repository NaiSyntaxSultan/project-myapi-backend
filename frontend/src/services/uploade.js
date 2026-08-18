import { uploadClient } from "./api";

export const uploadBatch = async (formData) => {
  const data = new FormData();

  data.append("smear_id", formData.smear_id);
  data.append("chicken_type", formData.chicken_type);
  data.append("province", formData.province);
  data.append("age", formData.age);
  data.append("stain_type", formData.stain_type);
  data.append("sex", formData.sex);

  formData.files.forEach((file) => {
    data.append("files", file);
  });

  const response = await uploadClient.post("/batches/upload", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};