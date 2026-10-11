import { apiFetch } from './authApi';

export const talentApi = {
  getTalents: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.append('page', params.page);
    if (params.pageSize) qs.append('pageSize', params.pageSize);
    if (params.keyword) qs.append('keyword', params.keyword);
    if (params.industry || params.major) qs.append('industry', params.industry || params.major);
    if (params.school || params.university) qs.append('school', params.school || params.university);
    if (params.minReliabilityScore || params.minScore) qs.append('minReliabilityScore', params.minReliabilityScore || params.minScore);
    if (params.minRate) qs.append('minRate', params.minRate);
    if (params.maxRate) qs.append('maxRate', params.maxRate);
    if (params.onlyVerified !== undefined) qs.append('onlyVerified', params.onlyVerified);
    if (params.skill) qs.append('skill', params.skill);
    if (params.skills && Array.isArray(params.skills)) {
      params.skills.forEach(s => {
        if (s && s.trim()) qs.append('skills', s.trim());
      });
    }
    const query = qs.toString();
    return apiFetch(`/talents${query ? '?' + query : ''}`, { method: 'GET' });
  },

  inviteTalent: (studentId, { jobId, message }) => {
    return apiFetch(`/talents/${studentId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ jobId, message })
    });
  }
};
