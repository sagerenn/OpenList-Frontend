import { Box, Button, Checkbox, HStack, Text, VStack } from "@hope-ui/solid"
import { createSignal, Show } from "solid-js"
import { useFetch, useManageTitle, useT } from "~/hooks"
import { handleResp, notify, extApi } from "~/utils"
import { ListPerm as ListPermConfig, PExtResp } from "~/types"
import { UserPicker } from "./UserPicker"

// ListPerm is the config page for feature 3 (per-user list permission
// control). An admin sets per-user can_list / can_read — e.g. a write-only
// drop box (both off) or read-without-list. Forward-compatible: load/save
// failures show a toast, never throw.
const ListPerm = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.ext_listperm")
  const [userId, setUserId] = createSignal<number | undefined>(undefined)
  const [canList, setCanList] = createSignal(true)
  const [canRead, setCanRead] = createSignal(true)
  const [loaded, setLoaded] = createSignal(false)

  const [getLoading, getListPerm] = useFetch(
    (uid: number): PExtResp<ListPermConfig> => extApi.get(`/listperm/${uid}`),
  )
  const [saving, saveListPerm] = useFetch(
    (uid: number, body: ListPermConfig): PExtResp<null> =>
      extApi.put(`/listperm/${uid}`, body),
  )

  const load = async () => {
    const uid = userId()
    if (uid === undefined) return
    setLoaded(false)
    const resp = await getListPerm(uid)
    handleResp(
      resp,
      (data) => {
        setCanList(data.can_list)
        setCanRead(data.can_read)
        setLoaded(true)
      },
      undefined,
      true,
      false,
    )
  }

  const onSave = async () => {
    const uid = userId()
    if (uid === undefined) {
      notify.error(t("ext.select_user"))
      return
    }
    const body: ListPermConfig = {
      user_id: uid,
      can_list: canList(),
      can_read: canRead(),
    }
    const resp = await saveListPerm(uid, body)
    handleResp(resp, () => notify.success(t("global.save_success")))
  }

  return (
    <VStack spacing="$2" alignItems="start" w="$full">
      <HStack spacing="$2" w="$full" alignItems="end" flexWrap="wrap">
        <Box minW="$48">
          <UserPicker
            value={userId()}
            onChange={(uid) => {
              setUserId(uid)
            }}
          />
        </Box>
        <Button
          onClick={load}
          loading={getLoading()}
          disabled={userId() === undefined}
        >
          {t("global.refresh")}
        </Button>
      </HStack>

      <Show when={loaded()}>
        <VStack spacing="$3" alignItems="start" w="$full" p="$2">
          <Checkbox
            checked={canList()}
            onChange={(e: any) => setCanList(e.currentTarget.checked)}
          >
            {t("ext.listperm.can_list")}
          </Checkbox>
          <Checkbox
            checked={canRead()}
            onChange={(e: any) => setCanRead(e.currentTarget.checked)}
          >
            {t("ext.listperm.can_read")}
          </Checkbox>
          <Text fontSize="$sm" color="$neutral10">
            {t("ext.listperm.hint")}
          </Text>
          <Button colorScheme="accent" onClick={onSave} loading={saving()}>
            {t("ext.listperm.save")}
          </Button>
        </VStack>
      </Show>
    </VStack>
  )
}

export default ListPerm
