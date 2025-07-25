import React from "react"
import { MessageSquare, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SmsTemplate } from "@/hooks/useSmsTemplates"

interface TemplateSelectionProps {
  templates: SmsTemplate[]
  selectedTemplate: SmsTemplate | null
  onTemplateSelect: (templateId: string) => void
  onRefreshTemplates: () => void
}

export const TemplateSelection: React.FC<TemplateSelectionProps> = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onRefreshTemplates,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="w-5 h-5 mr-2" />
          短信模板选择
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select onValueChange={onTemplateSelect}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="选择短信模板" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={onRefreshTemplates}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {selectedTemplate && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">模板内容:</p>
            <p className="text-sm">{selectedTemplate.content}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}