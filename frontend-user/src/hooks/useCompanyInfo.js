import { useState, useEffect } from 'react';
import { getPublicSystemConfigs } from '../api/authApi';

export const DEFAULT_COMPANY_INFO = {
  companyName: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ SKILLBRIDGE VIỆT NAM',
  projectName: 'Dự án Khởi nghiệp Sáng tạo Sinh viên · FPT University EXE Capstone Project',
  projectLead: 'TRẦN LÊ KHÁNH LINH',
  projectLeadTitle: 'Trưởng nhóm dự án (Project Lead)',
  techLead: 'ĐÀO VĂN NĂNG',
  techLeadTitle: 'Trưởng nhóm code (Technical Lead)',
  address: 'Trường Đại học FPT Hà Nội, Khu Công nghệ cao Hòa Lạc, Km29 Đại lộ Thăng Long, Huyện Thạch Thất, TP. Hà Nội, Việt Nam',
  hotline1: '0334404480',
  hotline2: '0956653307',
  email: 'skillbridge.vn@gmail.com',
  workingHours: '08:00 - 18:00 (Thứ 2 đến Thứ 7)'
};

let cachedCompanyInfo = null;
let fetchPromise = null;

export function useCompanyInfo() {
  const [companyInfo, setCompanyInfo] = useState(cachedCompanyInfo || DEFAULT_COMPANY_INFO);
  const [loading, setLoading] = useState(!cachedCompanyInfo);

  useEffect(() => {
    if (cachedCompanyInfo) {
      setCompanyInfo(cachedCompanyInfo);
      setLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = getPublicSystemConfigs()
        .then((data) => {
          if (data && (data.companyName || data.address || data.email)) {
            cachedCompanyInfo = {
              companyName: data.companyName || DEFAULT_COMPANY_INFO.companyName,
              projectName: data.projectName || DEFAULT_COMPANY_INFO.projectName,
              projectLead: data.projectLead || DEFAULT_COMPANY_INFO.projectLead,
              projectLeadTitle: data.projectLeadTitle || DEFAULT_COMPANY_INFO.projectLeadTitle,
              techLead: data.techLead || DEFAULT_COMPANY_INFO.techLead,
              techLeadTitle: data.techLeadTitle || DEFAULT_COMPANY_INFO.techLeadTitle,
              address: data.address || DEFAULT_COMPANY_INFO.address,
              hotline1: data.hotline1 || DEFAULT_COMPANY_INFO.hotline1,
              hotline2: data.hotline2 || DEFAULT_COMPANY_INFO.hotline2,
              email: data.email || DEFAULT_COMPANY_INFO.email,
              workingHours: data.workingHours || DEFAULT_COMPANY_INFO.workingHours
            };
          } else {
            cachedCompanyInfo = DEFAULT_COMPANY_INFO;
          }
          return cachedCompanyInfo;
        })
        .catch(() => {
          cachedCompanyInfo = DEFAULT_COMPANY_INFO;
          return cachedCompanyInfo;
        });
    }

    fetchPromise.then((info) => {
      setCompanyInfo(info);
      setLoading(false);
    });
  }, []);

  return { companyInfo, loading };
}
