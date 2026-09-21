import {
  Badge,
  Box,
  Button,
  HStack,
  Input,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectTrigger,
  SelectValue,
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
import { LBGroup, LBGroupDetail, LBMember, LBStrategy, PExtResp } from "~/types"
import { DeletePopover } from "../common/DeletePopover"
import { UserPicker } from "./UserPicker"

const Strategies: LBStrategy[] = ["round_robin", "least_used", "random"]

// LoadBalance is the config page for feature 4 (upload load-balancing). An
// admin creates named LB groups of backend mount paths with a selection
// strategy, and adds weighted members to each group. Forward-compatible:
// all fetch/mutation failures show a toast, never throw.
const LoadBalance = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.ext_lb")
  const [userId, setUserId] = createSignal<number | undefined>(undefined)
  const [groups, setGroups] = createSignal<LBGroup[]>([])

  // create-group form
  const [gName, setGName] = createSignal("")
  const [gStrategy, setGStrategy] = createSignal<LBStrategy>("round_robin")
  const [gPrefix, setGPrefix] = createSignal("")

  // add-member form per group
  const [memberPath, setMemberPath] = createSignal<Record<number, string>>({})
  const [memberWeight, setMemberWeight] = createSignal<Record<number, number>>(
    {},
  )
  // expanded group detail
  const [details, setDetails] = createSignal<Record<number, LBMember[]>>({})

  const [listLoading, listGroups] = useFetch(
    (uid: number): PExtResp<LBGroup[]> =>
      extApi.get(`/lb/group?user_id=${uid}`),
  )
  const [creating, createGroup] = useFetch(
    (body: Partial<LBGroup>): PExtResp<LBGroup> =>
      extApi.post("/lb/group", body),
  )
  const [deletingGroup, deleteGroup] = useListFetch(
    (id: number): PExtResp<null> => extApi.delete(`/lb/group/${id}`),
  )
  const [addingMember, addMember] = useListFetch(
    (id: number, body: Partial<LBMember>): PExtResp<LBMember> =>
      extApi.post(`/lb/group/${id}/member`, body),
  )

  const refresh = async () => {
    const uid = userId()
    if (uid === undefined) return
    const resp = await listGroups(uid)
    handleResp(resp, (data) => setGroups(data), undefined, true, false)
  }

  const loadMembers = async (id: number) => {
    const resp: PExtResp<LBGroupDetail> = extApi.get(`/lb/group/${id}`)
    const r = await resp
    handleResp(
      r,
      (data) => {
        setDetails((prev) => ({ ...prev, [id]: data.members }))
      },
      undefined,
      true,
      false,
    )
  }

  const onCreate = async () => {
    const uid = userId()
    if (uid === undefined) {
      notify.error(t("ext.select_user"))
      return
    }
    if (gName() === "") {
      notify.error(t("ext.lb.name"))
      return
    }
    const resp = await createGroup({
      name: gName(),
      user_id: uid,
      strategy: gStrategy(),
      path_prefix: gPrefix(),
    })
    handleResp(resp, () => {
      notify.success(t("global.save_success"))
      setGName("")
      setGPrefix("")
      refresh()
    })
  }

  const onAddMember = async (id: number) => {
    const path = memberPath()[id] || ""
    if (path === "") {
      notify.error(t("ext.lb.mount_path"))
      return
    }
    const resp = await addMember(id, {
      mount_path: path,
      weight: memberWeight()[id] || 1,
    })
    handleResp(resp, () => {
      setMemberPath((prev) => ({ ...prev, [id]: "" }))
      loadMembers(id)
    })
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

      {/* Create group */}
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
            <Box mb="$1">{t("ext.lb.name")}</Box>
            <Input
              placeholder={t("ext.lb.name")}
              value={gName()}
              onInput={(e) => setGName(e.currentTarget.value)}
              w="$40"
            />
          </Box>
          <Box w="$40">
            <Box mb="$1">{t("ext.lb.strategy")}</Box>
            <Select
              value={gStrategy()}
              onChange={(v: any) => setGStrategy(v as LBStrategy)}
            >
              <SelectTrigger>
                <SelectValue />
                <SelectIcon />
              </SelectTrigger>
              <SelectContent>
                <SelectListbox>
                  <For each={Strategies}>
                    {(s) => (
                      <SelectOption value={s}>
                        <SelectOptionText>{s}</SelectOptionText>
                        <SelectOptionIndicator />
                      </SelectOption>
                    )}
                  </For>
                </SelectListbox>
              </SelectContent>
            </Select>
          </Box>
          <Box>
            <Box mb="$1">{t("ext.lb.path_prefix")}</Box>
            <Input
              placeholder={t("ext.lb.path_prefix_placeholder")}
              value={gPrefix()}
              onInput={(e) => setGPrefix(e.currentTarget.value)}
              w="$48"
            />
          </Box>
          <Button colorScheme="accent" onClick={onCreate} loading={creating()}>
            {t("ext.lb.create")}
          </Button>
        </HStack>
      </VStack>

      {/* Groups list */}
      <Box w="$full" overflowX="auto">
        <Table highlightOnHover dense>
          <Thead>
            <Tr>
              <Th>{t("ext.lb.name")}</Th>
              <Th>{t("ext.lb.strategy")}</Th>
              <Th>{t("ext.lb.path_prefix")}</Th>
              <Th>{t("global.operations")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <For
              each={groups()}
              fallback={
                <Tr>
                  <Td>{t("ext.lb.no_groups")}</Td>
                </Tr>
              }
            >
              {(g) => (
                <Tr>
                  <Td>
                    <Badge colorScheme="info">{g.name}</Badge>
                  </Td>
                  <Td>{g.strategy}</Td>
                  <Td>{g.path_prefix || "-"}</Td>
                  <Td>
                    <HStack spacing="$2">
                      <Button onClick={() => loadMembers(g.id)} loading={false}>
                        {t("ext.lb.members")}
                      </Button>
                      <DeletePopover
                        name={g.name}
                        loading={deletingGroup() === g.id}
                        onClick={async () => {
                          const resp = await deleteGroup(g.id)
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

      {/* Members for expanded groups */}
      <For each={groups()}>
        {(g) => (
          <Show when={details()[g.id] !== undefined}>
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
                  <Box mb="$1">{t("ext.lb.mount_path")}</Box>
                  <Input
                    placeholder={t("ext.lb.mount_path_placeholder")}
                    value={memberPath()[g.id] || ""}
                    onInput={(e) =>
                      setMemberPath((prev) => ({
                        ...prev,
                        [g.id]: e.currentTarget.value,
                      }))
                    }
                    w="$48"
                  />
                </Box>
                <Box>
                  <Box mb="$1">{t("ext.lb.weight")}</Box>
                  <Input
                    type="number"
                    min={1}
                    value={memberWeight()[g.id] || 1}
                    onInput={(e) =>
                      setMemberWeight((prev) => ({
                        ...prev,
                        [g.id]: Number(e.currentTarget.value) || 1,
                      }))
                    }
                    w="$24"
                  />
                </Box>
                <Button
                  colorScheme="accent"
                  onClick={() => onAddMember(g.id)}
                  loading={addingMember() === g.id}
                >
                  {t("ext.lb.add_member")}
                </Button>
              </HStack>
              <Table dense>
                <Thead>
                  <Tr>
                    <Th>{t("ext.lb.mount_path")}</Th>
                    <Th>{t("ext.lb.weight")}</Th>
                    <Th>{t("ext.lb.upload_count")}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <For each={details()[g.id] || []}>
                    {(m) => (
                      <Tr>
                        <Td>{m.mount_path}</Td>
                        <Td>{m.weight}</Td>
                        <Td>{m.upload_count ?? 0}</Td>
                      </Tr>
                    )}
                  </For>
                </Tbody>
              </Table>
            </VStack>
          </Show>
        )}
      </For>
    </VStack>
  )
}

export default LoadBalance
