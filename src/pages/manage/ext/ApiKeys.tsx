import {
  Badge,
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  HStack,
  Input,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  VStack,
} from "@hope-ui/solid"
import { createSignal, For, Show } from "solid-js"
import { useFetch, useListFetch, useManageTitle, useT } from "~/hooks"
import { handleResp, notify, extApi } from "~/utils"
import {
  AllAPIKeyScopes,
  APIKey,
  APIKeyScope,
  CreatedKey,
  PExtResp,
  splitScopes,
} from "~/types"
import { DeletePopover } from "../common/DeletePopover"
import { UserPicker } from "./UserPicker"

// ApiKeys is the config page for feature 5 (API key auth + scoped
// operations). An admin creates per-user keys with selected scopes; the
// plaintext secret is shown exactly once on creation. Keys can be
// enabled/disabled and deleted. Forward-compatible: failures show a toast.
const ApiKeys = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.ext_apikeys")
  const [userId, setUserId] = createSignal<number | undefined>(undefined)
  const [keys, setKeys] = createSignal<APIKey[]>([])

  // create form
  const [kName, setKName] = createSignal("")
  const [kScopes, setKScopes] = createSignal<APIKeyScope[]>(["fs.get"])

  // one-time secret from creation
  const [createdSecret, setCreatedSecret] = createSignal<string | null>(null)

  const [listLoading, listKeys] = useFetch((uid: number): PExtResp<APIKey[]> =>
    extApi.get(`/apikey/${uid}`),
  )
  const [creating, createKey] = useFetch(
    (body: {
      user_id: number
      name: string
      scopes: APIKeyScope[]
    }): PExtResp<CreatedKey> => extApi.post("/apikey", body),
  )
  const [deletingKey, deleteKey] = useListFetch(
    (key: { uid: number; id: number }): PExtResp<null> =>
      extApi.delete(`/apikey/${key.uid}/${key.id}`),
  )
  const [toggling, toggleKey] = useListFetch(
    (key: { uid: number; id: number; enabled: boolean }): PExtResp<null> =>
      extApi.put(`/apikey/${key.uid}/${key.id}/enable`, {
        enabled: key.enabled,
      }),
  )

  const refresh = async () => {
    const uid = userId()
    if (uid === undefined) return
    const resp = await listKeys(uid)
    handleResp(resp, (data) => setKeys(data), undefined, true, false)
  }

  const onCreate = async () => {
    const uid = userId()
    if (uid === undefined) {
      notify.error(t("ext.select_user"))
      return
    }
    if (kName() === "") {
      notify.error(t("ext.apikey.name"))
      return
    }
    const resp = await createKey({
      user_id: uid,
      name: kName(),
      scopes: kScopes(),
    })
    handleResp(resp, (data) => {
      setCreatedSecret(data.secret)
      notify.success(t("global.save_success"))
      setKName("")
      refresh()
    })
  }

  const copySecret = async () => {
    const s = createdSecret()
    if (!s) return
    try {
      await navigator.clipboard.writeText(s)
      notify.success(t("ext.apikey.copy_secret"))
    } catch {
      notify.error(t("ext.apikey.copy_secret"))
    }
  }

  return (
    <VStack spacing="$3" alignItems="start" w="$full">
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
          onClick={refresh}
          loading={listLoading()}
          disabled={userId() === undefined}
        >
          {t("global.refresh")}
        </Button>
      </HStack>

      {/* Create key */}
      <VStack
        spacing="$2"
        alignItems="start"
        w="$full"
        p="$2"
        borderWidth="$1"
        borderColor="$neutral6"
        rounded="$md"
      >
        <HStack spacing="$2" flexWrap="wrap" alignItems="end">
          <Box>
            <Box mb="$1">{t("ext.apikey.name")}</Box>
            <Input
              placeholder={t("ext.apikey.name_placeholder")}
              value={kName()}
              onInput={(e) => setKName(e.currentTarget.value)}
              w="$40"
            />
          </Box>
        </HStack>
        <Box>
          <Box mb="$1">{t("ext.apikey.scopes")}</Box>
          <CheckboxGroup
            value={kScopes()}
            onChange={(vals: any) => setKScopes(vals as APIKeyScope[])}
          >
            <HStack spacing="$4" flexWrap="wrap">
              <For each={AllAPIKeyScopes}>
                {(s) => <Checkbox value={s}>{s}</Checkbox>}
              </For>
            </HStack>
          </CheckboxGroup>
        </Box>
        <Button colorScheme="accent" onClick={onCreate} loading={creating()}>
          {t("ext.apikey.create")}
        </Button>
      </VStack>

      {/* One-time secret */}
      <Show when={createdSecret() !== null}>
        <VStack
          spacing="$2"
          alignItems="start"
          w="$full"
          p="$2"
          borderWidth="$1"
          borderColor="$success6"
          rounded="$md"
          bgColor="$success2"
        >
          <Box fontWeight="$bold">{t("ext.apikey.secret_created")}</Box>
          <HStack spacing="$2" w="$full">
            <Input
              value={createdSecret() || ""}
              readOnly
              fontFamily="monospace"
              w="$full"
            />
            <Button onClick={copySecret}>{t("ext.apikey.copy_secret")}</Button>
          </HStack>
        </VStack>
      </Show>

      {/* Keys list */}
      <Box w="$full" overflowX="auto">
        <Table highlightOnHover dense>
          <Thead>
            <Tr>
              <Th>{t("ext.apikey.name")}</Th>
              <Th>{t("ext.apikey.prefix")}</Th>
              <Th>{t("ext.apikey.scopes")}</Th>
              <Th>{t("ext.apikey.enabled")}</Th>
              <Th>{t("global.operations")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <For
              each={keys()}
              fallback={
                <Tr>
                  <Td>{t("ext.apikey.no_keys")}</Td>
                </Tr>
              }
            >
              {(k) => (
                <Tr>
                  <Td>{k.name}</Td>
                  <Td>
                    <Badge colorScheme="neutral">{k.prefix}…</Badge>
                  </Td>
                  <Td>{splitScopes(k.scopes).join(", ") || "-"}</Td>
                  <Td>
                    <Badge colorScheme={k.enabled ? "success" : "danger"}>
                      {k.enabled ? "on" : "off"}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack spacing="$2">
                      <Button
                        colorScheme={k.enabled ? "danger" : "success"}
                        loading={toggling()?.id === k.id}
                        onClick={async () => {
                          const uid = userId()
                          if (uid === undefined) return
                          const resp = await toggleKey({
                            uid,
                            id: k.id,
                            enabled: !k.enabled,
                          })
                          handleResp(resp, () => {
                            notify.success(t("global.update_success"))
                            refresh()
                          })
                        }}
                      >
                        {k.enabled
                          ? t("ext.apikey.disable")
                          : t("ext.apikey.enable")}
                      </Button>
                      <DeletePopover
                        name={k.name}
                        loading={deletingKey()?.id === k.id}
                        onClick={async () => {
                          const uid = userId()
                          if (uid === undefined) return
                          const resp = await deleteKey({ uid, id: k.id })
                          handleResp(resp, () => {
                            notify.success(t("global.delete_success"))
                            refresh()
                          })
                        }}
                      />
                    </HStack>
                  </Td>
                </Tr>
              )}
            </For>
          </Tbody>
        </Table>
      </Box>
    </VStack>
  )
}

export default ApiKeys
