package com.mlreef.rest.external_api.gitlab

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue
import com.mlreef.rest.AccessLevel
import com.mlreef.rest.VisibilityScope


enum class GroupAccessLevel(val accessCode: Int) {
    GUEST(10),
    REPORTER(20),
    DEVELOPER(30),
    MAINTAINER(40),
    OWNER(50);

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromCode(code: Int?): GroupAccessLevel? {
            return values().firstOrNull { it.accessCode == code }
        }

        fun isSufficientFor(instance: GroupAccessLevel?, limit: GroupAccessLevel?): Boolean {
            if (limit == null) return true
            if (instance == null) return false
            return instance.accessCode >= limit.accessCode
        }
    }

    fun satisfies(limit: GroupAccessLevel?) = GroupAccessLevel.isSufficientFor(this, limit)
}

fun AccessLevel?.toGitlabAccessLevel(): GroupAccessLevel? {
    return GroupAccessLevel.fromCode(this?.accessCode)
}

fun GroupAccessLevel?.toAccessLevel(): AccessLevel? {
    return AccessLevel.fromCode(this?.accessCode)
}

enum class VariableType {
    ENV_VAR,
    FILE;

    @JsonValue
    open fun getValue(): String {
        return this.name.toLowerCase()
    }
}

enum class GitlabVisibility {
    PRIVATE,
    INTERNAL,
    PUBLIC
}

fun VisibilityScope.toGitlabVisibility(): GitlabVisibility {
    return GitlabVisibility.valueOf(this.name.toUpperCase())
}

fun GitlabVisibility.toVisibilityScope(): VisibilityScope {
    return VisibilityScope.valueOf(this.name.toUpperCase())
}

enum class ProjectCreationLevel {
    NOONE,
    MAINTAINER,
    DEVELOPER
}

enum class SubgroupCreationLevel {
    OWNER,
    MAINTAINER
}

enum class GitlabActivityState {
    ACTIVE,
    INACTIVE
}

enum class GitlabAccessLevel {
    DISABLED,
    PRIVATE,
    ENABLED
}

enum class NamespaceKind {
    USER,
    GROUP
}

enum class GitStrategy {
    FETCH,
    MERGE
}

enum class GitlabState {
    ENABLED,
    DISABLED
}

enum class MergeMethod {
    MERGE,
    REBASE_MERGE,
    FF
}

enum class DeployStrategy {
    CONTINUOUS,
    MANUAL,
    TIMED_INCREMENTAL
}
