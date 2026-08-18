import { registerClient } from './api';

export const registerVet = async (formData) => {
  try {
    const response = await registerClient.post('/auth/register', {
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      veterinary_license: formData.veterinaryLicense,
    });

    return {
      success: true,
      data: response.data,
      message: 'ลงทะเบียนสำเร็จ',
    };
  } catch (error) {
    if (error.response?.status === 409) {
      return {
        success: false,
        message: 'อีเมลนี้มีในระบบแล้ว',
      };
    }

    return {
      success: false,
      message: error.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
    };
  }
};