import React, { useState } from "react"
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Heading,
  Text,
  Badge,
  Select,
  Input,
  Button,
  IconButton,
  HStack,
  VStack,
} from "@chakra-ui/react"
import { useSelector } from "react-redux"
import { RootState } from '../../state/store';
import { CloseIcon } from "@chakra-ui/icons"

export const GroupViewer: React.FC = () => {
  const groups = useSelector((state: RootState) => state.settings.groups)
  const users = useSelector((state: RootState) => state.settings.users)
  const currentUserId = useSelector((state: RootState) => state.auth.profile_id)
  const assets = useSelector((state: RootState) => state.settings.availableCatalogs)

  const groupList = Object.values(groups)
  const [selectedGroupId, setSelectedGroupId] = useState(groupList[0]?.id || null)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [selectedAssetId, setSelectedAssetId] = useState("")

  const selectedGroup = selectedGroupId ? groups[selectedGroupId] : null
  const isOwner = selectedGroup?.owner === currentUserId

  const members: { id: string; permission: string }[] = selectedGroup
    ? [
        { id: selectedGroup.owner, permission: "owner" },
        ...selectedGroup.members.filter((m) => m.id !== selectedGroup.owner),
      ]
    : []

  const handleAddUser = async () => {
    if (!newUserEmail) return
    console.log(`Add user ${newUserEmail} to group ${selectedGroupId}`)
    setNewUserEmail("")
  }

  const handleRemoveUser = async (userId: string) => {
    console.log(`Remove user ${userId} from group ${selectedGroupId}`)
  }

  const handleShareAsset = async () => {
    if (!selectedAssetId) return
    console.log(`Share asset ${selectedAssetId} with group ${selectedGroupId}`)
    setSelectedAssetId("")
  }

  const ownedAssets = assets.filter(asset => asset.owner === currentUserId)

  return (
    <Box>
      <Heading size="md" mb={4}>Group Viewer</Heading>

      {groupList.length === 0 ? (
        <Text>No groups available.</Text>
      ) : (
        <>
          <Select
            mb={4}
            value={selectedGroupId || ""}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            {groupList.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>

          <TableContainer mb={6}>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Email</Th>
                  <Th>Permission</Th>
                  {isOwner && <Th textAlign="right">Actions</Th>}
                </Tr>
              </Thead>
              <Tbody>
                {members.map((member) => {
                  const user = users[member.id]
                  const isCurrentUser = member.id === currentUserId
                  const isGroupOwner = member.permission === "owner"

                  return (
                    <Tr key={member.id}>
                      <Td fontWeight={isCurrentUser ? "bold" : "normal"} color={isCurrentUser ? "blue.600" : "gray.800"}>
                        {user?.email_id || member.id}
                        {isCurrentUser && <Badge colorScheme="blue" ml={2}>You</Badge>}
                      </Td>
                      <Td>
                        <Badge colorScheme={
                          member.permission === "owner" ? "green" :
                          member.permission === "admin" ? "purple" : "blue"
                        }>
                          {member.permission}
                        </Badge>
                      </Td>
                      {isOwner && !isGroupOwner && (
                        <Td textAlign="right">
                          <IconButton
                            aria-label="Remove user"
                            icon={<CloseIcon />}
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleRemoveUser(member.id)}
                          />
                        </Td>
                      )}
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </TableContainer>

          {isOwner && (
            <VStack align="stretch" spacing={4}>
              <HStack>
                <Input
                  placeholder="Add user by email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
                <Button onClick={handleAddUser} colorScheme="green">Add</Button>
              </HStack>

              <HStack>
                <Select
                  placeholder="Select asset to share"
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                >
                  {ownedAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </Select>
                <Button onClick={handleShareAsset} colorScheme="blue">Share</Button>
              </HStack>
            </VStack>
          )}
        </>
      )}
    </Box>
  )
}
