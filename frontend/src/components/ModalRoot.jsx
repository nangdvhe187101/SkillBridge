import { useModal } from '../context/ModalContext';
import { TopupModal, WithdrawModal, SubscribeModal, HireModal, ClaimModal } from './modals/PayModals';
import { DeliverableModal, RevisionModal, DeliverableReviewModal } from './modals/DeliverableModals';
import { ReceiptModal, ViewJobModal, ReportModal, SuccessModal } from './modals/MiscModals';
import ChatModal from './modals/ChatModal';
import ReviewModal from './modals/ReviewModal';

export default function ModalRoot() {
  const { modal, closeModal } = useModal();
  if (!modal) return null;
  const props = { onClose: closeModal, ...modal.props };

  switch (modal.type) {
    case 'topup': return <TopupModal {...props} />;
    case 'withdraw': return <WithdrawModal {...props} />;
    case 'subscribe': return <SubscribeModal {...props} />;
    case 'hire': return <HireModal {...props} />;
    case 'claim': return <ClaimModal {...props} />;
    case 'deliverable': return <DeliverableModal {...props} />;
    case 'revision': return <RevisionModal {...props} />;
    case 'deliverableReview': return <DeliverableReviewModal {...props} />;
    case 'receipt': return <ReceiptModal {...props} />;
    case 'viewJob': return <ViewJobModal {...props} />;
    case 'report': return <ReportModal {...props} />;
    case 'success': return <SuccessModal {...props} />;
    case 'chat': return <ChatModal {...props} />;
    case 'review': return <ReviewModal {...props} />;
    default: return null;
  }
}