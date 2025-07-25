import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SmsTemplate } from "@/hooks/useSmsTemplates"

interface TemplateParametersProps {
  selectedTemplate: SmsTemplate | null
  templateParams: Record<string, string>
  onTemplateParamsChange: (params: Record<string, string>) => void
}

export const TemplateParameters: React.FC<TemplateParametersProps> = ({
  selectedTemplate,
  templateParams,
  onTemplateParamsChange,
}) => {
  if (!selectedTemplate || selectedTemplate.params.length === 0) {
    return null
  }

  const handleParamChange = (param: string, value: string) => {
    onTemplateParamsChange({
      ...templateParams,
      [param]: value,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>模板参数</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedTemplate.params.map((param, index) => (
          <div key={param}>
            <Label htmlFor={`param-${index}`}>{param}</Label>
            <Input
              id={`param-${index}`}
              placeholder={`请输入${param}`}
              value={templateParams[param] || ""}
              onChange={(e) => handleParamChange(param, e.target.value)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}