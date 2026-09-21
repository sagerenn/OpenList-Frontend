import { SideMenuItemProps } from "./SideMenu"
import {
  BsGearFill,
  BsPaletteFill,
  BsCameraFill,
  BsWindow,
  BsPersonCircle,
  BsJoystick,
  BsMedium,
  BsFingerprint,
  BsFront,
  BsCloudUploadFill,
  BsSearch,
  BsBucket,
  BsHddNetwork,
  BsArrowLeftRight,
  BsShieldFillExclamation,
} from "solid-icons/bs"
import { FiLogIn } from "solid-icons/fi"
import { SiMetabase } from "solid-icons/si"
import { CgDatabase, CgShare } from "solid-icons/cg"
import { OcWorkflow2 } from "solid-icons/oc"
import { IoCopy, IoMove, IoHome, IoMagnetOutline } from "solid-icons/io"
import { Component, lazy } from "solid-js"
import { Group, UserRole } from "~/types"
import {
  FaSolidBook,
  FaSolidDatabase,
  FaSolidPuzzlePiece,
} from "solid-icons/fa"
import { TbArchive } from "solid-icons/tb"

export type SideMenuItem = SideMenuItemProps & {
  component?: Component
  children?: SideMenuItem[]
}

const CommonSettings = lazy(() => import("./settings/Common"))

export const side_menu_items: SideMenuItem[] = [
  {
    title: "manage.sidemenu.profile",
    icon: BsFingerprint,
    to: "/@manage",
    role: UserRole.GUEST,
    component: lazy(() => import("./users/Profile")),
  },
  {
    title: "manage.sidemenu.settings",
    icon: BsGearFill,
    to: "/@manage/settings",
    children: [
      {
        title: "manage.sidemenu.site",
        icon: BsWindow,
        to: "/@manage/settings/site",
        component: () => <CommonSettings group={Group.SITE} />,
      },
      {
        title: "manage.sidemenu.style",
        icon: BsPaletteFill,
        to: "/@manage/settings/style",
        component: () => <CommonSettings group={Group.STYLE} />,
      },
      {
        title: "manage.sidemenu.preview",
        icon: BsCameraFill,
        to: "/@manage/settings/preview",
        component: () => <CommonSettings group={Group.PREVIEW} />,
      },
      {
        title: "manage.sidemenu.global",
        icon: BsJoystick,
        to: "/@manage/settings/global",
        component: () => <CommonSettings group={Group.GLOBAL} />,
      },
      {
        title: "manage.sidemenu.sso",
        icon: FiLogIn,
        to: "/@manage/settings/sso",
        component: () => <CommonSettings group={Group.SSO} />,
      },
      {
        title: "manage.sidemenu.ldap",
        icon: FiLogIn,
        to: "/@manage/settings/ldap",
        component: () => <CommonSettings group={Group.LDAP} />,
      },
      {
        title: "manage.sidemenu.s3",
        icon: BsBucket,
        to: "/@manage/settings/s3",
        backend: ["go"],
        component: lazy(() => import("./settings/S3")),
      },
      {
        title: "manage.sidemenu.ftp",
        icon: BsHddNetwork,
        to: "/@manage/settings/ftp",
        component: () => <CommonSettings group={Group.FTP} />,
      },
      {
        title: "manage.sidemenu.traffic",
        icon: BsArrowLeftRight,
        to: "/@manage/settings/traffic",
        component: () => <CommonSettings group={Group.TRAFFIC} />,
      },
      {
        title: "manage.sidemenu.other",
        icon: BsMedium,
        to: "/@manage/settings/other",
        component: lazy(() => import("./settings/Other")),
      },
    ],
  },
  {
    title: "manage.sidemenu.tasks",
    icon: OcWorkflow2,
    to: "/@manage/tasks",
    role: UserRole.GENERAL,
    backend: ["go"],
    children: [
      {
        title: "manage.sidemenu.offline_download",
        icon: IoMagnetOutline,
        to: "/@manage/tasks/offline_download",
        role: UserRole.GENERAL,
        component: lazy(() => import("./tasks/offline_download")),
      },
      // {
      //   title: "manage.sidemenu.aria2",
      //   icon: BsCloudArrowDownFill,
      //   to: "/@manage/tasks/aria2",
      //   component: lazy(() => import("./tasks/Aria2")),
      // },
      // {
      //   title: "manage.sidemenu.qbit",
      //   icon: FaBrandsQuinscape,
      //   to: "/@manage/tasks/qbit",
      //   component: lazy(() => import("./tasks/Qbit")),
      // },
      {
        title: "manage.sidemenu.upload",
        icon: BsCloudUploadFill,
        to: "/@manage/tasks/upload",
        role: UserRole.GENERAL,
        component: lazy(() => import("./tasks/Upload")),
      },
      {
        title: "manage.sidemenu.copy",
        icon: IoCopy,
        to: "/@manage/tasks/copy",
        role: UserRole.GENERAL,
        component: lazy(() => import("./tasks/Copy")),
      },
      {
        title: "manage.sidemenu.move",
        icon: IoMove,
        to: "/@manage/tasks/move",
        role: UserRole.GENERAL,
        component: lazy(() => import("./tasks/Move")),
      },
      {
        title: "manage.sidemenu.decompress",
        icon: TbArchive,
        to: "/@manage/tasks/decompress",
        role: UserRole.GENERAL,
        component: lazy(() => import("./tasks/Decompress")),
      },
    ],
  },
  {
    title: "manage.sidemenu.users",
    icon: BsPersonCircle,
    to: "/@manage/users",
    component: lazy(() => import("./users/Users")),
  },
  {
    // openlist-ext: per-user domain, TTL, list permission, load balance,
    // and API key configuration. The whole group is gated by `ext: true`,
    // which the SideMenu hides when the openlist-ext backend is not
    // reachable (forward compatibility with stock OpenList). Admin-only.
    title: "manage.sidemenu.extension",
    icon: BsShieldFillExclamation,
    to: "/@manage/ext",
    ext: true,
    children: [
      {
        title: "manage.sidemenu.ext_domain",
        icon: BsArrowLeftRight,
        to: "/@manage/ext/domain",
        ext: true,
        component: lazy(() => import("./ext/Domain")),
      },
      {
        title: "manage.sidemenu.ext_ttl",
        icon: BsMedium,
        to: "/@manage/ext/ttl",
        ext: true,
        component: lazy(() => import("./ext/Ttl")),
      },
      {
        title: "manage.sidemenu.ext_listperm",
        icon: BsPersonCircle,
        to: "/@manage/ext/listperm",
        ext: true,
        component: lazy(() => import("./ext/ListPerm")),
      },
      {
        title: "manage.sidemenu.ext_lb",
        icon: BsCloudUploadFill,
        to: "/@manage/ext/lb",
        ext: true,
        component: lazy(() => import("./ext/LoadBalance")),
      },
      {
        title: "manage.sidemenu.ext_apikeys",
        icon: BsFingerprint,
        to: "/@manage/ext/apikeys",
        ext: true,
        component: lazy(() => import("./ext/ApiKeys")),
      },
    ],
  },
  {
    title: "manage.sidemenu.storages",
    icon: CgDatabase,
    to: "/@manage/storages",
    component: lazy(() => import("./storages/Storages")),
  },
  {
    title: "manage.sidemenu.plugins",
    icon: FaSolidPuzzlePiece,
    to: "/@manage/plugins",
    backend: ["ts-worker"],
    component: lazy(() => import("./plugins")),
  },
  {
    title: "manage.sidemenu.shares",
    icon: CgShare,
    to: "/@manage/shares",
    role: UserRole.GENERAL,
    component: lazy(() => import("./shares/Shares")),
  },
  {
    title: "manage.sidemenu.metas",
    icon: SiMetabase,
    to: "/@manage/metas",
    component: lazy(() => import("./metas/Metas")),
  },
  {
    title: "manage.sidemenu.indexes",
    icon: BsSearch,
    to: "/@manage/indexes",
    component: lazy(() => import("./indexes/index_page")),
  },
  {
    title: "manage.sidemenu.backup-restore",
    to: "/@manage/backup-restore",
    icon: FaSolidDatabase,
    component: lazy(() => import("./backup-restore")),
  },
  {
    title: "manage.sidemenu.about",
    icon: BsFront,
    to: "/@manage/about",
    role: UserRole.GUEST,
    component: lazy(() => import("./About")),
  },
  {
    title: "manage.sidemenu.docs",
    icon: FaSolidBook,
    to: "https://doc.oplist.org",
    role: UserRole.GUEST,
    external: true,
  },
  {
    title: "manage.sidemenu.home",
    icon: IoHome,
    to: "/",
    role: UserRole.GUEST,
    refresh: true,
  },
]
