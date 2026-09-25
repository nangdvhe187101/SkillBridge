import { useModal } from '../context/ModalContext';
import { TopupModal, WithdrawModal, SubscribeModal, UpgradeVipModal, PlanPurchaseModal, HireModal, ClaimModal } from './modals/PayModals';
import { DeliverableModal, RevisionModal, DeliverableReviewModal } from './modals/DeliverableModals';
import { ReceiptModal, ViewJobModal, SuccessModal } from './modals/MiscModals';
import ReportModal from './modals/ReportModal';
import ChatModal from './modals/ChatModal';
import ReviewModal from './modals/ReviewModal';
import KycModal from './modals/KycModal';
import DisputeModal from './modals/DisputeModal';
import DisputeDetailModal from './modals/DisputeDetailModal';
import DeadlineExtensionModal from './modals/DeadlineExtensionModal';

export default function ModalRoot() {
  const { modal, closeModal } = useModal();
  if (!modal) return null;
  const props = { onClose: closeModal, ...modal.props };

  switch (modal.type) {
    case 'topup': return <TopupModal {...props} />;
    case 'withdraw': return <WithdrawModal {...props} />;
    case 'subscribe': return <SubscribeModal {...props} />;
    case 'upgradeVip': return <UpgradeVipModal {...props} />;
    case 'planPurchase': return <PlanPurchaseModal {...props} />;
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
    case 'kyc': return <KycModal {...props} />;
    case 'dispute': return <DisputeModal {...props} />;
    case 'disputeDetail': return <DisputeDetailModal {...props} />;
    case 'deadlineExtension': return <DeadlineExtensionModal {...props} />;
    default: return null;
  }
}