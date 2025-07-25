import React from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SmsTemplate } from "@/hooks/useSmsTemplates"

interface SendButtonsProps {
  selectedTemplate: SmsTemplate | null
  phoneNumber: string
  isSending: boolean
  onSendSms: () => void
  onShowBulkSendModal: () => void
}

export const SendButtons: React.FC<SendButtonsProps> = ({
  selectedTemplate,
  phoneNumber,
  isSending,
  onSendSms,
  onShowBulkSendModal,
}) => {
  return (
    <div className="space-y-3">
      <Button
        onClick={onSendSms}
        disabled={!selectedTemplate || !phoneNumber.trim() || isSending}
        className="w-full"
        size="lg"
      >
        <Send className="w-4 h-4 mr-2" />
        {isSending ? "发送中..." : "发送短信"}
      </Button>
      
      {selectedTemplate && (
        <Button
          onClick={onShowBulkSendModal}
          disabled={isSending}
          variant="outline"
          className="w-full"
          size="lg"
        >
          <Send className="w-4 h-4 mr-2" />
          一键发送给所有号码
        </Button>
      )}
    </div>
  )
}