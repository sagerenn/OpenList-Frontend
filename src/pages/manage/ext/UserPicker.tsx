import {
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectPlaceholder,
  SelectTrigger,
  SelectValue,
} from "@hope-ui/solid"
import { createSignal, For, onMount } from "solid-js"
import { useFetch, useT } from "~/hooks"
import { handleResp, notify, r } from "~/utils"
import { PPageResp, User } from "~/types"

// UserPicker is a shared single-select dropdown of OpenList users, used by
// the extension config pages to choose which user a setting applies to. It
// loads /admin/user/list once on mount and exposes the selected user id via
// the onChange callback. Forward-compatible: on fetch failure it shows an
// empty list and a toast rather than throwing.
export const UserPicker = (props: {
  value?: number
  onChange: (userId: number) => void
  placeholder?: string
}) => {
  const t = useT()
  const [users, setUsers] = createSignal<User[]>([])
  const [getUsersLoading, getUsers] = useFetch((): PPageResp<User> =>
    r.get("/admin/user/list"),
  )
  onMount(async () => {
    const resp = await getUsers()
    handleResp(resp, (data) => setUsers(data.content), undefined, true, false)
    if (resp.code !== 200) {
      notify.error(t("ext.fetch_user_error"))
    }
  })
  return (
    <Select
      value={props.value}
      onChange={(value: any) => props.onChange(Number(value))}
      disabled={getUsersLoading()}
    >
      <SelectTrigger>
        <SelectPlaceholder>
          {props.placeholder || t("ext.select_user")}
        </SelectPlaceholder>
        <SelectValue />
        <SelectIcon />
      </SelectTrigger>
      <SelectContent>
        <SelectListbox>
          <For each={users()}>
            {(item) => (
              <SelectOption value={item.id}>
                <SelectOptionText>
                  {item.username} (id: {item.id})
                </SelectOptionText>
                <SelectOptionIndicator />
              </SelectOption>
            )}
          </For>
        </SelectListbox>
      </SelectContent>
    </Select>
  )
}
