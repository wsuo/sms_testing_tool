"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Phone } from "lucide-react"
import PhoneNumberManager from "./phone-number-manager"

interface PhoneNumberManagerModalProps {
  onPhoneNumbersChange?: () => void
  onSelectNumber?: (number: string) => void
}

export default function PhoneNumberManagerModal({ 
  onPhoneNumbersChange, 
  onSelectNumber 
}: PhoneNumberManagerModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Phone className="w-4 h-4 mr-2" />
          管理号码
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Phone className="w-5 h-5 mr-2" />
            手机号码管理
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <PhoneNumberManager onPhoneNumbersChange={onPhoneNumbersChange} showCard={false} />
        </div>
      </DialogContent>
    </Dialog>
  )
}