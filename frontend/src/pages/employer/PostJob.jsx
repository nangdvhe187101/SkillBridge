import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import PostJobForm from '../../components/PostJobForm';
import { useStore } from '../../context/StoreContext';

export default function PostJob() {
  const { state } = useStore();
  const navigate = useNavigate();
  const editingJob = state.editingJobId ? state.myJobs.find((j) => j.id === state.editingJobId) : null;

  return (
    <div className="page active">
      <div className="post-body wrap">
        <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); navigate(editingJob ? '/dashboard' : '/'); }}>
          <Icon name="chevleft" /> {editingJob ? 'Về Dashboard' : 'Về trang chủ'}
        </a>

        <PostJobForm onDone={() => navigate('/dashboard')} />
      </div>
    </div>
  );
}