import { Briefcase, Hash, Mail, Phone, User, UserCheck, Users } from "lucide-react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { BRAND_PRIMARY } from "@/constants/brand";
import { CURRENT_USER } from "@/mocks/current-user";

export function MyPage() {
  return (
    <div className="p-6 max-w-2xl">
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-5">
        <div
          className="h-24"
          style={{
            background:
              "linear-gradient(135deg, #4A327F 0%, #7C5CFF 58%, #B8A8FF 100%)",
          }}
        />
        <div className="px-6 pt-4 pb-6 relative">
          <div
            className="-mt-14 w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow mb-3"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            {CURRENT_USER.name.charAt(0)}
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{CURRENT_USER.name}</h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                {CURRENT_USER.jobGrade} · {CURRENT_USER.position}
              </p>
              <p className="text-muted-foreground text-sm">{CURRENT_USER.department}</p>
            </div>
            <StatusBadge status={CURRENT_USER.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold text-foreground mb-4">기본 정보</h3>
          <div className="space-y-3.5">
            {[
              { icon: Hash, label: "사번", value: CURRENT_USER.employeeNo },
              { icon: Mail, label: "이메일", value: CURRENT_USER.email },
              { icon: Phone, label: "전화번호", value: CURRENT_USER.phone },
              { icon: User, label: "로그인 ID", value: CURRENT_USER.loginId },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">{label}</p>
                  <p className="text-sm text-foreground font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">직급 · 직책</h3>
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">직급</p>
                  <p className="text-sm font-medium text-foreground">{CURRENT_USER.jobGrade}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">직책</p>
                  <p className="text-sm font-medium text-foreground">{CURRENT_USER.position}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">소속 조직</h3>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold">주소속</p>
                <p className="text-sm font-medium text-foreground">{CURRENT_USER.department}</p>
                <p className="text-xs text-muted-foreground">개발본부</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

