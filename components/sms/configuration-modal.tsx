import React from "react"
import { Settings, Eye, EyeOff } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ConfigurationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  adminToken: string
  refreshToken: string
  showAdminToken: boolean
  showRefreshToken: boolean
  onAdminTokenChange: (value: string) => void
  onRefreshTokenChange: (value: string) => void
  onToggleAdminTokenVisibility: () => void
  onToggleRefreshTokenVisibility: () => void
  onSaveTokens: () => void
}

export const ConfigurationModal: React.FC<ConfigurationModalProps> = ({
  open,
  onOpenChange,
  adminToken,
  refreshToken,
  showAdminToken,
  showRefreshToken,
  onAdminTokenChange,
  onRefreshTokenChange,
  onToggleAdminTokenVisibility,
  onToggleRefreshTokenVisibility,
  onSaveTokens,
}) => {
  const handleEyeToggle = (field: 'admin' | 'refresh') => {
    if (field === 'admin') {
      onToggleAdminTokenVisibility()
    } else {
      onToggleRefreshTokenVisibility()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Token配置
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>获取令牌说明：</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• 管理后台令牌：登录后台管理系统获取API Token</li>
                <li>• 阿里云AccessKey已在服务器环境变量中配置</li>
                <li>• 令牌过期时需要重新获取并配置</li>
              </ul>
            </AlertDescription>
          </Alert>
          <div>
            <Label htmlFor="modal-admin-token">管理后台令牌</Label>
            <div className="relative">
              <Input
                id="modal-admin-token"
                type={showAdminToken ? "text" : "password"}
                placeholder="请输入管理后台API令牌"
                value={adminToken}
                onChange={(e) => onAdminTokenChange(e.target.value)}
                className="pr-10"
                autoComplete="off"
              />
              <div
                className="absolute right-0 top-0 h-full px-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600 select-none"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleEyeToggle('admin')
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                {showAdminToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="modal-refresh-token">管理后台刷新令牌 (可选)</Label>
            <div className="relative">
              <Input
                id="modal-refresh-token"
                type={showRefreshToken ? "text" : "password"}
                placeholder="请输入管理后台刷新令牌"
                value={refreshToken}
                onChange={(e) => onRefreshTokenChange(e.target.value)}
                className="pr-10"
                autoComplete="off"
              />
              <div
                className="absolute right-0 top-0 h-full px-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600 select-none"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleEyeToggle('refresh')
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                {showRefreshToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              提供刷新令牌可以自动更新过期的访问令牌
            </p>
          </div>
          <Button onClick={onSaveTokens} className="w-full">
            保存配置
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}